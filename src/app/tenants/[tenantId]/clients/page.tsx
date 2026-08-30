import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AuthorizationError,
  getTenantForUser,
  listClientsForTenant,
  NotFoundError,
} from "@/server/clinic-service";
import type { Client, Tenant } from "@/server/models";
import { requireAuthenticatedUser } from "@/server/user-session";

type ClientsPageProps = {
  params: Promise<{
    tenantId: string;
  }>;
};

export default async function ClientsPage({ params }: ClientsPageProps) {
  const { tenantId } = await params;
  const user = await requireAuthenticatedUser();
  let tenant: Tenant;
  let clients: Client[];

  try {
    [tenant, clients] = await Promise.all([
      getTenantForUser(user.id, tenantId),
      listClientsForTenant(user.id, tenantId),
    ]);
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }

  return (
    <main className="page-shell">
      <section className="home" aria-labelledby="page-title">
        <div className="section-heading">
          <div>
            <p className="home__eyebrow">Clients</p>
            <h1 id="page-title">{tenant.name}</h1>
          </div>
          <div className="button-row">
            <Link className="button" href="/">
              Dashboard
            </Link>
            <Link
              className="button button--primary"
              href={`/tenants/${tenantId}/clients/new`}
            >
              New client
            </Link>
          </div>
        </div>

        {clients.length > 0 ? (
          <div className="list">
            {clients.map((client) => (
              <Link
                className="list-item"
                href={`/tenants/${tenantId}/clients/${client._id?.toHexString()}`}
                key={client._id?.toHexString()}
              >
                <span>
                  <strong>{client.name}</strong>
                  <small>
                    {client.email || client.phoneNumber || "No contact"}
                  </small>
                </span>
                <span aria-hidden="true">Open</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="status-panel">
            <p>No clients yet. Add the first client for this clinic.</p>
          </div>
        )}
      </section>
    </main>
  );
}
