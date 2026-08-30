import Link from "next/link";
import { notFound } from "next/navigation";
import { createClientNoteAction } from "@/app/actions";
import {
  AuthorizationError,
  getClientDetailForUser,
  getTenantForUser,
  NotFoundError,
} from "@/server/clinic-service";
import { formatDateTimeInTimeZone } from "@/server/date-time";
import type { Appointment, Client, ClientNote, Tenant } from "@/server/models";
import { requireAuthenticatedUser } from "@/server/user-session";

type ClientDetailPageProps = {
  params: Promise<{
    tenantId: string;
    clientId: string;
  }>;
};

export default async function ClientDetailPage({
  params,
}: ClientDetailPageProps) {
  const { tenantId, clientId } = await params;
  const user = await requireAuthenticatedUser();
  const action = createClientNoteAction.bind(null, tenantId, clientId);
  let tenant: Tenant;
  let client: Client;
  let notes: ClientNote[];
  let appointments: Appointment[];

  try {
    const detailResults = await Promise.all([
      getTenantForUser(user.id, tenantId),
      getClientDetailForUser(user.id, tenantId, clientId),
    ]);
    tenant = detailResults[0];
    const detail = detailResults[1];
    client = detail.client;
    notes = detail.notes;
    appointments = detail.appointments;
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
            <p className="home__eyebrow">{tenant.name}</p>
            <h1 id="page-title">{client.name}</h1>
          </div>
          <Link className="button" href={`/tenants/${tenantId}/clients`}>
            Clients
          </Link>
        </div>

        <div className="detail-grid">
          <section className="status-panel" aria-labelledby="contact-title">
            <h2 id="contact-title">Client profile</h2>
            <dl className="details">
              <div>
                <dt>Language</dt>
                <dd>{client.language || "Not recorded"}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{client.phoneNumber || "Not recorded"}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{client.email || "Not recorded"}</dd>
              </div>
              <div>
                <dt>Discounts</dt>
                <dd>{client.discountNotes || "Not recorded"}</dd>
              </div>
              <div>
                <dt>Notes</dt>
                <dd>{client.generalNotes || "Not recorded"}</dd>
              </div>
            </dl>
          </section>

          <section className="status-panel" aria-labelledby="notes-title">
            <h2 id="notes-title">Session notes</h2>
            <form className="form form--compact" action={action}>
              <label>
                Add note
                <textarea name="body" rows={4} required />
              </label>
              <button className="button button--primary" type="submit">
                Save note
              </button>
            </form>

            {notes.length > 0 ? (
              <div className="note-list">
                {notes.map((note) => (
                  <article className="note" key={note._id?.toHexString()}>
                    <p>{note.body}</p>
                    <time dateTime={note.createdAt.toISOString()}>
                      {note.createdAt.toLocaleDateString()}
                    </time>
                  </article>
                ))}
              </div>
            ) : (
              <p>No session notes recorded.</p>
            )}
          </section>
        </div>

        <section className="status-panel" aria-labelledby="history-title">
          <div className="section-heading section-heading--compact">
            <h2 id="history-title">Appointment history</h2>
            <Link
              className="button button--primary"
              href={`/tenants/${tenantId}/appointments/new`}
            >
              New appointment
            </Link>
          </div>

          {appointments.length > 0 ? (
            <div className="calendar-list calendar-list--compact">
              {appointments.map((appointment) => (
                <Link
                  className="calendar-item"
                  href={`/tenants/${tenantId}/appointments/${appointment._id?.toHexString()}/edit`}
                  key={appointment._id?.toHexString()}
                >
                  <time dateTime={appointment.startsAt.toISOString()}>
                    {formatDateTimeInTimeZone(
                      appointment.startsAt,
                      appointment.timezone,
                    )}
                  </time>
                  <div>
                    <strong>{appointment.title}</strong>
                    <small>{appointment.notes || "No notes"}</small>
                  </div>
                  <span className={`status status--${appointment.status}`}>
                    {appointment.status === "no-show"
                      ? "No-show"
                      : appointment.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p>No appointment history yet.</p>
          )}
        </section>
      </section>
    </main>
  );
}
