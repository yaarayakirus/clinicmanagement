import Link from "next/link";
import { notFound } from "next/navigation";
import { updateTenantTimezoneAction } from "@/app/actions";
import { TimezoneSelect } from "@/components/timezone-select";
import {
  AuthorizationError,
  getTenantForUser,
  listAppointmentsForTenant,
  listClientsForTenant,
  NotFoundError,
} from "@/server/clinic-service";
import { formatDateTimeInTimeZone } from "@/server/date-time";
import type { Appointment, Client, Tenant } from "@/server/models";
import { requireAuthenticatedUser } from "@/server/user-session";

type AppointmentsPageProps = {
  params: Promise<{
    tenantId: string;
  }>;
};

function statusLabel(status: Appointment["status"]) {
  return status === "no-show" ? "No-show" : status;
}

function syncStatusLabel(status: Appointment["googleCalendarSyncStatus"]) {
  if (status === "not_configured") {
    return "Calendar not connected";
  }

  return `Calendar ${status}`;
}

function clientNameFor(clients: Client[], clientId: string) {
  return (
    clients.find((client) => client._id?.toHexString() === clientId)?.name ??
    "Unknown client"
  );
}

export default async function AppointmentsPage({
  params,
}: AppointmentsPageProps) {
  const { tenantId } = await params;
  const user = await requireAuthenticatedUser();
  let tenant: Tenant;
  let appointments: Appointment[];
  let clients: Client[];

  try {
    [tenant, appointments, clients] = await Promise.all([
      getTenantForUser(user.id, tenantId),
      listAppointmentsForTenant(user.id, tenantId),
      listClientsForTenant(user.id, tenantId),
    ]);
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }

  const timezone = tenant.timezone ?? "America/New_York";
  const timezoneAction = updateTenantTimezoneAction.bind(null, tenantId);

  return (
    <main className="page-shell">
      <section className="home" aria-labelledby="page-title">
        <div className="section-heading">
          <div>
            <p className="home__eyebrow">Calendar</p>
            <h1 id="page-title">{tenant.name}</h1>
          </div>
          <div className="button-row">
            <Link className="button" href={`/tenants/${tenantId}/clients`}>
              Clients
            </Link>
            <Link
              className="button button--primary"
              href={`/tenants/${tenantId}/appointments/new`}
            >
              New appointment
            </Link>
          </div>
        </div>

        <div className="toolbar-panel">
          <form className="inline-form" action={timezoneAction}>
            <TimezoneSelect label="Clinic timezone" defaultValue={timezone} />
            <button className="button" type="submit">
              Save
            </button>
          </form>
        </div>

        {appointments.length > 0 ? (
          <div className="calendar-list">
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
                  <small>{clientNameFor(clients, appointment.clientId)}</small>
                </div>
                <div className="status-stack">
                  <span className={`status status--${appointment.status}`}>
                    {statusLabel(appointment.status)}
                  </span>
                  <span
                    className={`status status--sync-${appointment.googleCalendarSyncStatus}`}
                  >
                    {syncStatusLabel(appointment.googleCalendarSyncStatus)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="status-panel">
            <p>No appointments yet. Schedule the first appointment.</p>
          </div>
        )}
      </section>
    </main>
  );
}
