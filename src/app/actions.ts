"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createClientForTenant,
  createClientNoteForTenant,
  createTenantForOwner,
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
