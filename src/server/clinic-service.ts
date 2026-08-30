import "server-only";

import type { Collection, Db, OptionalUnlessRequiredId } from "mongodb";
import { getAppointmentForTenant } from "@/server/appointment-access";
import { getClientForTenant } from "@/server/client-access";
import {
  normalizeTimezone,
  parseDateTimeLocalInTimeZone,
} from "@/server/date-time";
import {
  cancelGoogleCalendarEvent,
  createGoogleCalendarEvent,
  resolveGoogleAccessToken,
  updateGoogleCalendarEvent,
  type GoogleTokens,
} from "@/server/google-calendar";
import { getDb } from "@/server/mongodb";
import { parseObjectId } from "@/server/ids";
import type {
  Appointment,
  AppointmentStatus,
  Client,
  ClientNote,
  PractitionerOption,
  Role,
  Tenant,
  TenantMembership,
  User,
} from "@/server/models";

type SessionUserInput = {
  googleSubjectId: string;
  email: string;
  name?: string | null;
  image?: string | null;
};

type GoogleAccountTokenInput = SessionUserInput & {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
};

export type ClientInput = {
  name: string;
  language: string;
  phoneNumber: string;
  email: string;
  discountNotes: string;
  generalNotes: string;
};

export type AppointmentInput = {
  clientId: string;
  practitionerMembershipId?: string;
  title: string;
  status: AppointmentStatus;
  startsAtLocal: string;
  durationMinutes: string;
  timezone: string;
  notes: string;
};

export type DashboardTenant = {
  id: string;
  name: string;
  role: Role;
};

export class AuthorizationError extends Error {
  constructor(message = "You do not have access to this resource") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function requireText(value: unknown, fieldName: string): string {
  const text = cleanText(value);

  if (!text) {
    throw new Error(`${fieldName} is required`);
  }

  return text;
}

function requireAppointmentStatus(
  status: AppointmentStatus,
): AppointmentStatus {
  if (
    status !== "scheduled" &&
    status !== "completed" &&
    status !== "cancelled" &&
    status !== "no-show"
  ) {
    throw new Error("Appointment status is invalid");
  }

  return status;
}

function users(db: Db): Collection<User> {
  return db.collection<User>("users");
}

function tenants(db: Db): Collection<Tenant> {
  return db.collection<Tenant>("tenants");
}

function memberships(db: Db): Collection<TenantMembership> {
  return db.collection<TenantMembership>("tenantMemberships");
}

function clients(db: Db): Collection<Client> {
  return db.collection<Client>("clients");
}

function clientNotes(db: Db): Collection<ClientNote> {
  return db.collection<ClientNote>("clientNotes");
}

function appointments(db: Db): Collection<Appointment> {
  return db.collection<Appointment>("appointments");
}

async function getUserGoogleTokens(
  db: Db,
  userId: string,
): Promise<GoogleTokens | null> {
  const userObjectId = parseObjectId(userId);

  if (!userObjectId) {
    return null;
  }

  const user = await users(db).findOne({ _id: userObjectId });

  if (!user) {
    return null;
  }

  return {
    accessToken: user.googleAccessToken,
    refreshToken: user.googleRefreshToken,
    accessTokenExpiresAt: user.googleAccessTokenExpiresAt,
  };
}

async function getUsableGoogleAccessToken(
  db: Db,
  userId: string,
): Promise<string | null> {
  const tokens = await getUserGoogleTokens(db, userId);

  if (!tokens) {
    return null;
  }

  const resolvedTokens = await resolveGoogleAccessToken(tokens);
  const userObjectId = parseObjectId(userId);

  if (!resolvedTokens || !userObjectId) {
    return null;
  }

  await users(db).updateOne(
    { _id: userObjectId },
    {
      $set: {
        googleAccessToken: resolvedTokens.accessToken,
        googleRefreshToken:
          resolvedTokens.refreshToken ?? tokens.refreshToken ?? null,
        googleAccessTokenExpiresAt: resolvedTokens.accessTokenExpiresAt,
        updatedAt: new Date(),
      },
    },
  );

  return resolvedTokens.accessToken;
}

async function markAppointmentSync(
  db: Db,
  appointmentId: string,
  status: Appointment["googleCalendarSyncStatus"],
  googleCalendarEventId?: string | null,
): Promise<void> {
  const appointmentObjectId = parseObjectId(appointmentId);

  if (!appointmentObjectId) {
    return;
  }

  await appointments(db).updateOne(
    { _id: appointmentObjectId },
    {
      $set: {
        googleCalendarSyncStatus: status,
        ...(googleCalendarEventId !== undefined
          ? { googleCalendarEventId }
          : {}),
        updatedAt: new Date(),
      },
    },
  );
}

async function syncCreatedAppointmentToGoogleCalendar(
  db: Db,
  userId: string,
  tenant: Tenant,
  client: Client,
  appointment: Appointment,
  appointmentId: string,
): Promise<void> {
  const accessToken = await getUsableGoogleAccessToken(db, userId);

  if (!accessToken) {
    await markAppointmentSync(db, appointmentId, "not_configured");
    return;
  }

  try {
    await markAppointmentSync(db, appointmentId, "pending");
    const googleCalendarEventId = await createGoogleCalendarEvent(
      accessToken,
      appointment,
      tenant,
      client,
    );
    await markAppointmentSync(
      db,
      appointmentId,
      "synced",
      googleCalendarEventId,
    );
  } catch {
    await markAppointmentSync(db, appointmentId, "failed");
  }
}

async function syncUpdatedAppointmentToGoogleCalendar(
  db: Db,
  userId: string,
  tenant: Tenant,
  client: Client,
  appointment: Appointment,
): Promise<void> {
  if (!appointment._id) {
    return;
  }

  const appointmentId = appointment._id.toHexString();
  const accessToken = await getUsableGoogleAccessToken(db, userId);

  if (!accessToken) {
    await markAppointmentSync(db, appointmentId, "not_configured");
    return;
  }

  if (!appointment.googleCalendarEventId) {
    await syncCreatedAppointmentToGoogleCalendar(
      db,
      userId,
      tenant,
      client,
      appointment,
      appointmentId,
    );
    return;
  }

  try {
    await markAppointmentSync(db, appointmentId, "pending");
    await updateGoogleCalendarEvent(
      accessToken,
      appointment.googleCalendarEventId,
      appointment,
      tenant,
      client,
    );
    await markAppointmentSync(
      db,
      appointmentId,
      "synced",
      appointment.googleCalendarEventId,
    );
  } catch {
    await markAppointmentSync(db, appointmentId, "failed");
  }
}

async function syncCancelledAppointmentToGoogleCalendar(
  db: Db,
  userId: string,
  appointment: Appointment,
): Promise<void> {
  if (!appointment._id) {
    return;
  }

  const appointmentId = appointment._id.toHexString();

  if (!appointment.googleCalendarEventId) {
    await markAppointmentSync(db, appointmentId, "not_configured");
    return;
  }

  const accessToken = await getUsableGoogleAccessToken(db, userId);

  if (!accessToken) {
    await markAppointmentSync(db, appointmentId, "not_configured");
    return;
  }

  try {
    await markAppointmentSync(db, appointmentId, "pending");
    await cancelGoogleCalendarEvent(
      accessToken,
      appointment.googleCalendarEventId,
    );
    await markAppointmentSync(db, appointmentId, "synced", null);
  } catch {
    await markAppointmentSync(db, appointmentId, "failed");
  }
}

export async function storeGoogleTokensFromAccount(
  input: GoogleAccountTokenInput,
): Promise<void> {
  const db = await getDb();
  const now = new Date();
  const existingUser = await users(db).findOne({
    googleSubjectId: input.googleSubjectId,
  });
  const refreshToken =
    input.refreshToken ?? existingUser?.googleRefreshToken ?? null;
  const accessToken =
    input.accessToken ?? existingUser?.googleAccessToken ?? null;
  const accessTokenExpiresAt = input.expiresAt
    ? new Date(input.expiresAt * 1000)
    : (existingUser?.googleAccessTokenExpiresAt ?? null);

  await users(db).updateOne(
    { googleSubjectId: input.googleSubjectId },
    {
      $set: {
        email: input.email.toLowerCase(),
        name: input.name ?? null,
        image: input.image ?? null,
        googleAccessToken: accessToken,
        googleRefreshToken: refreshToken,
        googleAccessTokenExpiresAt: accessTokenExpiresAt,
        updatedAt: now,
      },
      $setOnInsert: {
        googleSubjectId: input.googleSubjectId,
        createdAt: now,
      },
    },
    { upsert: true },
  );
}

export async function upsertUserFromSession(input: SessionUserInput): Promise<{
  id: string;
  googleSubjectId: string;
  email: string;
  name?: string | null;
  image?: string | null;
}> {
  const db = await getDb();
  const now = new Date();
  const normalizedEmail = input.email.toLowerCase();

  await users(db).updateOne(
    { googleSubjectId: input.googleSubjectId },
    {
      $set: {
        email: normalizedEmail,
        name: input.name ?? null,
        image: input.image ?? null,
        updatedAt: now,
      },
      $setOnInsert: {
        googleSubjectId: input.googleSubjectId,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const user = await users(db).findOne({
    googleSubjectId: input.googleSubjectId,
  });

  if (!user?._id) {
    throw new Error("Unable to load signed-in user");
  }

  return {
    id: user._id.toHexString(),
    googleSubjectId: user.googleSubjectId,
    email: user.email,
    name: user.name,
    image: user.image,
  };
}

export async function listTenantsForUser(
  userId: string,
): Promise<DashboardTenant[]> {
  const db = await getDb();
  const userMemberships = await memberships(db)
    .find({ userId })
    .sort({ createdAt: 1 })
    .toArray();

  const results = await Promise.all(
    userMemberships.map(async (membership) => {
      const tenantObjectId = parseObjectId(membership.tenantId);

      if (!tenantObjectId) {
        return null;
      }

      const tenant = await tenants(db).findOne({ _id: tenantObjectId });

      if (!tenant?._id) {
        return null;
      }

      return {
        id: tenant._id.toHexString(),
        name: tenant.name,
        role: membership.role,
      };
    }),
  );

  return results.filter((tenant): tenant is DashboardTenant => tenant !== null);
}

export async function createTenantForOwner(
  userId: string,
  name: unknown,
  timezone?: unknown,
): Promise<string> {
  const db = await getDb();
  const now = new Date();
  const tenantName = requireText(name, "Clinic name");

  const tenantResult = await tenants(db).insertOne({
    name: tenantName,
    timezone: normalizeTimezone(cleanText(timezone)),
    createdAt: now,
    updatedAt: now,
  });

  const tenantId = tenantResult.insertedId.toHexString();

  await memberships(db).insertOne({
    tenantId,
    userId,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  });

  return tenantId;
}

export async function requireTenantMembership(
  db: Db,
  userId: string,
  tenantId: string,
  allowedRoles: Role[] = ["owner", "staff", "client"],
): Promise<TenantMembership> {
  const membership = await memberships(db).findOne({ userId, tenantId });

  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new AuthorizationError();
  }

  return membership;
}

export async function listPractitionersForTenant(
  userId: string,
  tenantId: string,
): Promise<PractitionerOption[]> {
  const db = await getDb();
  await requireTenantMembership(db, userId, tenantId, ["owner", "staff"]);

  const staffMemberships = await memberships(db)
    .find({ tenantId, role: { $in: ["owner", "staff"] } })
    .sort({ role: 1, createdAt: 1 })
    .toArray();

  const options = await Promise.all(
    staffMemberships.map(async (membership) => {
      const userObjectId = parseObjectId(membership.userId);

      if (!membership._id || !userObjectId) {
        return null;
      }

      const user = await users(db).findOne({ _id: userObjectId });

      return {
        membershipId: membership._id.toHexString(),
        name: user?.name ?? user?.email ?? membership.role,
        role: membership.role,
      };
    }),
  );

  return options.filter(
    (option): option is PractitionerOption => option !== null,
  );
}

export async function getTenantForUser(
  userId: string,
  tenantId: string,
): Promise<Tenant> {
  const db = await getDb();
  await requireTenantMembership(db, userId, tenantId);

  const tenantObjectId = parseObjectId(tenantId);

  if (!tenantObjectId) {
    throw new NotFoundError("Clinic not found");
  }

  const tenant = await tenants(db).findOne({ _id: tenantObjectId });

  if (!tenant) {
    throw new NotFoundError("Clinic not found");
  }

  return tenant;
}

export async function updateTenantTimezone(
  userId: string,
  tenantId: string,
  timezone: unknown,
): Promise<void> {
  const db = await getDb();
  await requireTenantMembership(db, userId, tenantId, ["owner"]);

  const tenantObjectId = parseObjectId(tenantId);

  if (!tenantObjectId) {
    throw new NotFoundError("Clinic not found");
  }

  await tenants(db).updateOne(
    { _id: tenantObjectId },
    {
      $set: {
        timezone: normalizeTimezone(cleanText(timezone)),
        updatedAt: new Date(),
      },
    },
  );
}

export async function listClientsForTenant(
  userId: string,
  tenantId: string,
): Promise<Client[]> {
  const db = await getDb();
  await requireTenantMembership(db, userId, tenantId, ["owner", "staff"]);

  return clients(db).find({ tenantId }).sort({ name: 1 }).toArray();
}

export async function createClientForTenant(
  userId: string,
  tenantId: string,
  input: ClientInput,
): Promise<string> {
  const db = await getDb();
  await requireTenantMembership(db, userId, tenantId, ["owner", "staff"]);

  const now = new Date();
  const result = await clients(db).insertOne({
    tenantId,
    name: requireText(input.name, "Client name"),
    language: cleanText(input.language),
    phoneNumber: cleanText(input.phoneNumber),
    email: cleanText(input.email).toLowerCase(),
    discountNotes: cleanText(input.discountNotes),
    generalNotes: cleanText(input.generalNotes),
    createdAt: now,
    updatedAt: now,
  });

  return result.insertedId.toHexString();
}

export async function getClientDetailForUser(
  userId: string,
  tenantId: string,
  clientId: string,
): Promise<{
  client: Client;
  notes: ClientNote[];
  appointments: Appointment[];
}> {
  const db = await getDb();
  await requireTenantMembership(db, userId, tenantId, ["owner", "staff"]);

  const client = await getClientForTenant(db, tenantId, clientId);

  if (!client) {
    throw new NotFoundError("Client not found");
  }

  const notes = await clientNotes(db)
    .find({ tenantId, clientId })
    .sort({ createdAt: -1 })
    .toArray();

  const clientAppointments = await appointments(db)
    .find({ tenantId, clientId })
    .sort({ startsAt: -1 })
    .toArray();

  return { client, notes, appointments: clientAppointments };
}

export async function createClientNoteForTenant(
  userId: string,
  tenantId: string,
  clientId: string,
  body: unknown,
): Promise<void> {
  const db = await getDb();
  await requireTenantMembership(db, userId, tenantId, ["owner", "staff"]);

  const client = await getClientForTenant(db, tenantId, clientId);

  if (!client) {
    throw new NotFoundError("Client not found");
  }

  const now = new Date();

  await clientNotes(db).insertOne({
    tenantId,
    clientId,
    body: requireText(body, "Note"),
    createdAt: now,
    updatedAt: now,
  } as OptionalUnlessRequiredId<ClientNote>);
}

function parseAppointmentInput(
  input: AppointmentInput,
  fallbackTimezone: string | undefined,
): Omit<Appointment, "_id" | "tenantId" | "createdAt" | "updatedAt"> {
  const timezone = normalizeTimezone(input.timezone || fallbackTimezone);
  const startsAt = parseDateTimeLocalInTimeZone(input.startsAtLocal, timezone);
  const durationMinutes = Number(input.durationMinutes);

  if (!Number.isFinite(durationMinutes) || durationMinutes < 15) {
    throw new Error("Duration must be at least 15 minutes");
  }

  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

  return {
    clientId: requireText(input.clientId, "Client"),
    practitionerMembershipId: cleanText(input.practitionerMembershipId),
    title: requireText(input.title, "Appointment title"),
    status: requireAppointmentStatus(input.status),
    startsAt,
    endsAt,
    timezone,
    notes: cleanText(input.notes),
    googleCalendarEventId: null,
    googleCalendarSyncStatus: "not_configured",
  };
}

async function requireAssignablePractitioner(
  db: Db,
  tenantId: string,
  practitionerMembershipId: string,
): Promise<void> {
  const cleanedId = cleanText(practitionerMembershipId);

  if (!cleanedId) {
    return;
  }

  const membershipObjectId = parseObjectId(cleanedId);

  if (!membershipObjectId) {
    throw new NotFoundError("Practitioner not found");
  }

  const membership = await memberships(db).findOne({
    _id: membershipObjectId,
    tenantId,
    role: { $in: ["owner", "staff"] },
  });

  if (!membership) {
    throw new NotFoundError("Practitioner not found");
  }
}

export async function listAppointmentsForTenant(
  userId: string,
  tenantId: string,
): Promise<Appointment[]> {
  const db = await getDb();
  await requireTenantMembership(db, userId, tenantId, ["owner", "staff"]);

  return appointments(db).find({ tenantId }).sort({ startsAt: 1 }).toArray();
}

export async function getAppointmentDetailForUser(
  userId: string,
  tenantId: string,
  appointmentId: string,
): Promise<Appointment> {
  const db = await getDb();
  await requireTenantMembership(db, userId, tenantId, ["owner", "staff"]);

  const appointment = await getAppointmentForTenant(
    db,
    tenantId,
    appointmentId,
  );

  if (!appointment) {
    throw new NotFoundError("Appointment not found");
  }

  return appointment;
}

export async function createAppointmentForTenant(
  userId: string,
  tenantId: string,
  input: AppointmentInput,
): Promise<string> {
  const db = await getDb();
  await requireTenantMembership(db, userId, tenantId, ["owner", "staff"]);

  const tenant = await getTenantForUser(userId, tenantId);
  const client = await getClientForTenant(db, tenantId, input.clientId);

  if (!client) {
    throw new NotFoundError("Client not found");
  }

  await requireAssignablePractitioner(
    db,
    tenantId,
    input.practitionerMembershipId ?? "",
  );

  const now = new Date();
  const parsed = parseAppointmentInput(input, tenant.timezone ?? undefined);
  const result = await appointments(db).insertOne({
    ...parsed,
    tenantId,
    createdAt: now,
    updatedAt: now,
  });

  const appointmentId = result.insertedId.toHexString();
  await syncCreatedAppointmentToGoogleCalendar(
    db,
    userId,
    tenant,
    client,
    {
      ...parsed,
      _id: result.insertedId,
      tenantId,
      createdAt: now,
      updatedAt: now,
    },
    appointmentId,
  );

  return appointmentId;
}

export async function updateAppointmentForTenant(
  userId: string,
  tenantId: string,
  appointmentId: string,
  input: AppointmentInput,
): Promise<void> {
  const db = await getDb();
  await requireTenantMembership(db, userId, tenantId, ["owner", "staff"]);

  const tenant = await getTenantForUser(userId, tenantId);
  const existingAppointment = await getAppointmentForTenant(
    db,
    tenantId,
    appointmentId,
  );

  if (!existingAppointment) {
    throw new NotFoundError("Appointment not found");
  }

  const client = await getClientForTenant(db, tenantId, input.clientId);

  if (!client) {
    throw new NotFoundError("Client not found");
  }

  await requireAssignablePractitioner(
    db,
    tenantId,
    input.practitionerMembershipId ?? "",
  );

  const appointmentObjectId = parseObjectId(appointmentId);

  if (!appointmentObjectId) {
    throw new NotFoundError("Appointment not found");
  }

  const parsed = parseAppointmentInput(input, tenant.timezone ?? undefined);

  await appointments(db).updateOne(
    { tenantId, _id: appointmentObjectId },
    {
      $set: {
        ...parsed,
        updatedAt: new Date(),
      },
    },
  );

  await syncUpdatedAppointmentToGoogleCalendar(db, userId, tenant, client, {
    ...existingAppointment,
    ...parsed,
    _id: appointmentObjectId,
    tenantId,
    updatedAt: new Date(),
  });
}

export async function cancelAppointmentForTenant(
  userId: string,
  tenantId: string,
  appointmentId: string,
): Promise<void> {
  const db = await getDb();
  await requireTenantMembership(db, userId, tenantId, ["owner", "staff"]);

  const appointmentObjectId = parseObjectId(appointmentId);

  if (!appointmentObjectId) {
    throw new NotFoundError("Appointment not found");
  }

  const existingAppointment = await getAppointmentForTenant(
    db,
    tenantId,
    appointmentId,
  );

  if (!existingAppointment) {
    throw new NotFoundError("Appointment not found");
  }

  const result = await appointments(db).updateOne(
    { tenantId, _id: appointmentObjectId },
    {
      $set: {
        status: "cancelled",
        updatedAt: new Date(),
      },
    },
  );

  if (result.matchedCount === 0) {
    throw new NotFoundError("Appointment not found");
  }

  await syncCancelledAppointmentToGoogleCalendar(db, userId, {
    ...existingAppointment,
    status: "cancelled",
    updatedAt: new Date(),
  });
}
