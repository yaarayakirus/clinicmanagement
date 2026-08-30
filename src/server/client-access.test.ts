import { ObjectId, type Filter } from "mongodb";
import { describe, expect, it } from "vitest";
import {
  getClientForTenant,
  tenantClientFilter,
  type ClientDb,
} from "@/server/client-access";
import type { Client } from "@/server/models";

function makeClient(tenantId: string, name: string): Client {
  const now = new Date("2026-08-30T12:00:00.000Z");

  return {
    _id: new ObjectId(),
    tenantId,
    name,
    language: "English",
    phoneNumber: "555-0100",
    email: `${name.toLowerCase().replaceAll(" ", ".")}@example.test`,
    discountNotes: "",
    generalNotes: "",
    createdAt: now,
    updatedAt: now,
  };
}

function makeFakeDb(seedClients: Client[]): ClientDb {
  return {
    collection(name: string) {
      if (name !== "clients") {
        throw new Error(`Unexpected collection: ${name}`);
      }

      return {
        async findOne(clientFilter: Filter<Client>) {
          return (
            seedClients.find((client) => {
              return (
                client.tenantId === clientFilter.tenantId &&
                client._id?.equals(clientFilter._id as ObjectId)
              );
            }) ?? null
          );
        },
      };
    },
  };
}

describe("tenant client access", () => {
  it("builds client reads with tenant ownership and client id", () => {
    const clientId = new ObjectId().toHexString();

    expect(tenantClientFilter("tenant-a", clientId)).toEqual({
      tenantId: "tenant-a",
      _id: new ObjectId(clientId),
    });
  });

  it("denies cross-tenant client reads when an id from another tenant is used", async () => {
    const tenantAClient = makeClient("tenant-a", "Tenant A Client");
    const tenantBClient = makeClient("tenant-b", "Tenant B Client");
    const db = makeFakeDb([tenantAClient, tenantBClient]);

    await expect(
      getClientForTenant(
        db,
        "tenant-a",
        tenantBClient._id?.toHexString() ?? "",
      ),
    ).resolves.toBeNull();
  });

  it("allows same-tenant client reads", async () => {
    const tenantAClient = makeClient("tenant-a", "Tenant A Client");
    const db = makeFakeDb([tenantAClient]);

    await expect(
      getClientForTenant(
        db,
        "tenant-a",
        tenantAClient._id?.toHexString() ?? "",
      ),
    ).resolves.toEqual(tenantAClient);
  });
});
