"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  cancelAppointmentForTenant,
  createAppointmentForTenant,
  createClientForTenant,
  createClientNoteForTenant,
  createTenantForOwner,
  updateAppointmentForTenant,
  updateTenantGoogleCalendarEmbedUrl,
  updateTenantTimezone,
  type AppointmentInput,
} from "@/server/clinic-service";
import { requireAuthenticatedUser } from "@/server/user-session";

function getString(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

export async function createTenantAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const tenantId = await createTenantForOwner(
    user.id,
    getString(formData, "name"),
    getString(formData, "timezone"),
  );

  revalidatePath("/");
  redirect(`/tenants/${tenantId}/clients`);
}

export async function createClientAction(tenantId: string, formData: FormData) {
  const user = await requireAuthenticatedUser();
  const clientId = await createClientForTenant(user.id, tenantId, {
    name: getString(formData, "name"),
    language: getString(formData, "language"),
    phoneNumber: getString(formData, "phoneNumber"),
    email: getString(formData, "email"),
    discountNotes: getString(formData, "discountNotes"),
    generalNotes: getString(formData, "generalNotes"),
  });

  revalidatePath(`/tenants/${tenantId}/clients`);
  redirect(`/tenants/${tenantId}/clients/${clientId}`);
}

export async function createClientNoteAction(
  tenantId: string,
  clientId: string,
  formData: FormData,
) {
  const user = await requireAuthenticatedUser();

  await createClientNoteForTenant(
    user.id,
    tenantId,
    clientId,
    getString(formData, "body"),
  );

  revalidatePath(`/tenants/${tenantId}/clients/${clientId}`);
}

function appointmentInputFromForm(formData: FormData): AppointmentInput {
  return {
    clientId: getString(formData, "clientId"),
    practitionerMembershipId: getString(formData, "practitionerMembershipId"),
    title: getString(formData, "title"),
    status: getString(formData, "status") as AppointmentInput["status"],
    startsAtLocal: getString(formData, "startsAtLocal"),
    durationMinutes: getString(formData, "durationMinutes"),
    timezone: getString(formData, "timezone"),
    notes: getString(formData, "notes"),
  };
}

export async function updateTenantTimezoneAction(
  tenantId: string,
  formData: FormData,
) {
  const user = await requireAuthenticatedUser();

  await updateTenantTimezone(
    user.id,
    tenantId,
    getString(formData, "timezone"),
  );

  revalidatePath(`/tenants/${tenantId}/appointments`);
  revalidatePath(`/tenants/${tenantId}/clients`);
}

export async function updateTenantGoogleCalendarEmbedUrlAction(
  tenantId: string,
  formData: FormData,
) {
  const user = await requireAuthenticatedUser();

  await updateTenantGoogleCalendarEmbedUrl(
    user.id,
    tenantId,
    getString(formData, "googleCalendarEmbedUrl"),
  );

  revalidatePath(`/tenants/${tenantId}/appointments`);
}

export async function createAppointmentAction(
  tenantId: string,
  formData: FormData,
) {
  const user = await requireAuthenticatedUser();
  const appointmentId = await createAppointmentForTenant(
    user.id,
    tenantId,
    appointmentInputFromForm(formData),
  );

  revalidatePath(`/tenants/${tenantId}/appointments`);
  redirect(`/tenants/${tenantId}/appointments/${appointmentId}/edit`);
}

export async function updateAppointmentAction(
  tenantId: string,
  appointmentId: string,
  formData: FormData,
) {
  const user = await requireAuthenticatedUser();

  await updateAppointmentForTenant(
    user.id,
    tenantId,
    appointmentId,
    appointmentInputFromForm(formData),
  );

  revalidatePath(`/tenants/${tenantId}/appointments`);
  revalidatePath(`/tenants/${tenantId}/appointments/${appointmentId}/edit`);
  redirect(`/tenants/${tenantId}/appointments`);
}

export async function cancelAppointmentAction(
  tenantId: string,
  appointmentId: string,
) {
  const user = await requireAuthenticatedUser();

  await cancelAppointmentForTenant(user.id, tenantId, appointmentId);

  revalidatePath(`/tenants/${tenantId}/appointments`);
  revalidatePath(`/tenants/${tenantId}/appointments/${appointmentId}/edit`);
  redirect(`/tenants/${tenantId}/appointments`);
}
