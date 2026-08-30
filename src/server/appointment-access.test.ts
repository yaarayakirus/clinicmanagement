import { ObjectId, type Filter } from "mongodb";
import { describe, expect, it } from "vitest";
import {
  getAppointmentForTenant,
  tenantAppointmentFilter,
  type AppointmentDb,
} from "@/server/appointment-access";
import type { Appointment } from "@/server/models";

function makeAppointment(tenantId: string, clientId: string): Appointment {
  const now = new Date("2026-08-30T12:00:00.000Z");

  return {
    _id: new ObjectId(),
    tenantId,
    clientId,
    title: "Appointment",
    status: "scheduled",
    startsAt: new Date("2026-09-01T14:00:00.000Z"),
    endsAt: new Date("2026-09-01T15:00:00.000Z"),
    timezone: "America/New_York",
    notes: "",
    googleCalendarEventId: null,
    googleCalendarSyncStatus: "not_configured",
    createdAt: now,
    updatedAt: now,
  };
}

function makeFakeDb(seedAppointments: Appointment[]): AppointmentDb {
  return {
    collection(name: string) {
      if (name !== "appointments") {
        throw new Error(`Unexpected collection: ${name}`);
      }

      return {
        async findOne(appointmentFilter: Filter<Appointment>) {
          return (
            seedAppointments.find((appointment) => {
              return (
                appointment.tenantId === appointmentFilter.tenantId &&
                appointment._id?.equals(appointmentFilter._id as ObjectId)
              );
            }) ?? null
          );
        },
      };
    },
  };
}

describe("tenant appointment access", () => {
  it("builds appointment reads with tenant ownership and appointment id", () => {
    const appointmentId = new ObjectId().toHexString();

    expect(tenantAppointmentFilter("tenant-a", appointmentId)).toEqual({
      tenantId: "tenant-a",
      _id: new ObjectId(appointmentId),
    });
  });

  it("denies cross-tenant appointment reads when an id from another tenant is used", async () => {
    const tenantAAppointment = makeAppointment("tenant-a", "client-a");
    const tenantBAppointment = makeAppointment("tenant-b", "client-b");
    const db = makeFakeDb([tenantAAppointment, tenantBAppointment]);

    await expect(
      getAppointmentForTenant(
        db,
        "tenant-a",
        tenantBAppointment._id?.toHexString() ?? "",
      ),
    ).resolves.toBeNull();
  });

  it("allows same-tenant appointment reads", async () => {
    const tenantAAppointment = makeAppointment("tenant-a", "client-a");
    const db = makeFakeDb([tenantAAppointment]);

    await expect(
      getAppointmentForTenant(
        db,
        "tenant-a",
        tenantAAppointment._id?.toHexString() ?? "",
      ),
    ).resolves.toEqual(tenantAAppointment);
  });
});
