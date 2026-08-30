import type { Filter } from "mongodb";
import { ObjectId } from "mongodb";
import { parseObjectId } from "@/server/ids";
import type { Client } from "@/server/models";

export type ClientDb = {
  collection(name: string): {
    findOne(filter: Filter<Client>): Promise<Client | null>;
  };
};

export function tenantClientFilter(
  tenantId: string,
  clientId?: string,
): Filter<Client> {
  const filter: Filter<Client> = { tenantId };

  if (clientId) {
    const clientObjectId = parseObjectId(clientId);

    filter._id = clientObjectId ?? new ObjectId("000000000000000000000000");
  }

  return filter;
}

export async function getClientForTenant(
  db: ClientDb,
  tenantId: string,
  clientId: string,
): Promise<Client | null> {
  const client = await db
    .collection("clients")
    .findOne(tenantClientFilter(tenantId, clientId));

  return client;
}
