import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { SignInButton, SignOutButton } from "@/components/auth-buttons";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main className="page-shell">
      <section className="home" aria-labelledby="page-title">
        <div className="home__header">
          <div>
            <p className="home__eyebrow">Phase 0 foundation</p>
            <h1 id="page-title">Clinic Management</h1>
            <p className="home__summary">
              A secure local scaffold for a multi-tenant clinic management app,
              ready for authenticated web workflows and MongoDB-backed data.
            </p>
          </div>
        </div>

        <div className="status-panel">
          <h2>Authentication state</h2>
          {session?.user ? (
            <>
              <p>
                Signed in as {session.user.name ?? session.user.email ?? "user"}
                .
              </p>
              <div className="button-row">
                <SignOutButton />
              </div>
            </>
          ) : (
            <>
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
