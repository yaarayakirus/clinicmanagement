import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/server/auth";
import { SignInButton, SignOutButton } from "@/components/auth-buttons";
import {
  listTenantsForUser,
  upsertUserFromSession,
} from "@/server/clinic-service";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const user =
    session?.user?.email && session.user.googleSubjectId
      ? await upsertUserFromSession({
          googleSubjectId: session.user.googleSubjectId,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
        })
      : null;
  const tenantList = user ? await listTenantsForUser(user.id) : [];

  return (
    <main className="page-shell">
      <section className="home" aria-labelledby="page-title">
        <div className="home__header">
          <div>
            <p className="home__eyebrow">Phase 0 foundation</p>
            <h1 id="page-title">Clinic Management</h1>
            <p className="home__summary">
              Secure client management for multi-tenant body treatment and
              psychology clinics.
            </p>
          </div>
          {user ? <SignOutButton /> : null}
        </div>

        <div className="status-panel">
          {user ? (
            <>
              <div className="section-heading">
                <div>
                  <p className="home__eyebrow">Signed in</p>
                  <h2>{user.name ?? user.email}</h2>
                </div>
                <Link className="button button--primary" href="/tenants/new">
                  New clinic
                </Link>
              </div>

              {tenantList.length > 0 ? (
                <div className="list">
                  {tenantList.map((tenant) => (
                    <Link
                      className="list-item"
                      href={`/tenants/${tenant.id}/clients`}
                      key={tenant.id}
                    >
                      <span>
                        <strong>{tenant.name}</strong>
                        <small>{tenant.role}</small>
                      </span>
                      <span aria-hidden="true">View clients</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p>Create your first clinic to start adding clients.</p>
              )}
            </>
          ) : (
            <>
              <h2>Authentication state</h2>
              <p>Not signed in. Google OAuth is configured through Auth.js.</p>
              <div className="button-row">
                <SignInButton />
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
