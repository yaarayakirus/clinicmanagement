import type { ObjectId } from "mongodb";

export type Role = "owner" | "staff" | "client";

export type User = {
  _id?: ObjectId;
  googleSubjectId: string;
  email: string;
  name?: string | null;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Tenant = {
  _id?: ObjectId;
  name: string;
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
