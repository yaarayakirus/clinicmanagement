import type { ObjectId } from "mongodb";

export type Role = "owner" | "staff" | "client";

export type AppointmentStatus =
  "scheduled" | "completed" | "cancelled" | "no-show";

export type User = {
  _id?: ObjectId;
  googleSubjectId: string;
  email: string;
  name?: string | null;
  image?: string | null;
  googleAccessToken?: string | null;
  googleRefreshToken?: string | null;
  googleAccessTokenExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Tenant = {
  _id?: ObjectId;
  name: string;
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TenantMembership = {
  _id?: ObjectId;
  tenantId: string;
  userId: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};

export type PractitionerOption = {
  membershipId: string;
  name: string;
  role: Role;
};

export type Client = {
  _id?: ObjectId;
  tenantId: string;
  name: string;
  language: string;
  phoneNumber: string;
  email: string;
  discountNotes: string;
  generalNotes: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ClientNote = {
  _id?: ObjectId;
  tenantId: string;
  clientId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Appointment = {
  _id?: ObjectId;
  tenantId: string;
  clientId: string;
  practitionerMembershipId?: string;
  title: string;
  status: AppointmentStatus;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  notes: string;
  googleCalendarEventId?: string | null;
  googleCalendarSyncStatus: "not_configured" | "pending" | "synced" | "failed";
  createdAt: Date;
  updatedAt: Date;
};
