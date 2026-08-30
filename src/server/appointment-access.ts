import type { Filter } from "mongodb";
import { ObjectId } from "mongodb";
import { parseObjectId } from "@/server/ids";
import type { Appointment } from "@/server/models";

export type AppointmentDb = {
  collection(name: string): {
    findOne(filter: Filter<Appointment>): Promise<Appointment | null>;
  };
};

export function tenantAppointmentFilter(
  tenantId: string,
  appointmentId?: string,
): Filter<Appointment> {
  const filter: Filter<Appointment> = { tenantId };

  if (appointmentId) {
    filter._id =
      parseObjectId(appointmentId) ?? new ObjectId("000000000000000000000000");
  }

  return filter;
}

export async function getAppointmentForTenant(
  db: AppointmentDb,
  tenantId: string,
  appointmentId: string,
): Promise<Appointment | null> {
  return db
    .collection("appointments")
    .findOne(tenantAppointmentFilter(tenantId, appointmentId));
}
