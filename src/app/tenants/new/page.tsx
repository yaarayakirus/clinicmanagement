import Link from "next/link";
import { createTenantAction } from "@/app/actions";
import { requireAuthenticatedUser } from "@/server/user-session";

export default async function NewTenantPage() {
  await requireAuthenticatedUser();

  return (
    <main className="page-shell">
      <section className="form-page" aria-labelledby="page-title">
        <div className="section-heading">
          <div>
            <p className="home__eyebrow">New clinic</p>
            <h1 id="page-title">Create a clinic</h1>
          </div>
          <Link className="button" href="/">
            Dashboard
          </Link>
        </div>

        <form className="form" action={createTenantAction}>
          <label>
            Clinic name
            <input name="name" required autoComplete="organization" />
          </label>

          <button className="button button--primary" type="submit">
            Create clinic
          </button>
        </form>
      </section>
    </main>
  );
}
