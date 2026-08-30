import Link from "next/link";
import { notFound } from "next/navigation";
import { createClientAction } from "@/app/actions";
import {
  AuthorizationError,
  getTenantForUser,
  NotFoundError,
} from "@/server/clinic-service";
import type { Tenant } from "@/server/models";
import { requireAuthenticatedUser } from "@/server/user-session";

type NewClientPageProps = {
  params: Promise<{
    tenantId: string;
  }>;
};

export default async function NewClientPage({ params }: NewClientPageProps) {
  const { tenantId } = await params;
  const user = await requireAuthenticatedUser();
  let tenant: Tenant;
  const action = createClientAction.bind(null, tenantId);

  try {
    tenant = await getTenantForUser(user.id, tenantId);
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }

  return (
    <main className="page-shell">
      <section className="form-page" aria-labelledby="page-title">
        <div className="section-heading">
          <div>
            <p className="home__eyebrow">{tenant.name}</p>
            <h1 id="page-title">New client</h1>
          </div>
          <Link className="button" href={`/tenants/${tenantId}/clients`}>
            Clients
          </Link>
        </div>

        <form className="form" action={action}>
          <label>
            Name
            <input name="name" required autoComplete="name" />
          </label>

          <label>
            Language
            <input name="language" autoComplete="language" />
          </label>

          <label>
            Phone number
            <input name="phoneNumber" autoComplete="tel" />
          </label>

          <label>
            Email
            <input name="email" type="email" autoComplete="email" />
          </label>

          <label>
            Discount notes
            <textarea name="discountNotes" rows={3} />
          </label>

          <label>
            General notes
            <textarea name="generalNotes" rows={5} />
          </label>

          <button className="button button--primary" type="submit">
            Create client
          </button>
        </form>
      </section>
    </main>
  );
}
