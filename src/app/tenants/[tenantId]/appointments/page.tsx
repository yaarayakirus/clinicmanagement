import Link from "next/link";
import { notFound } from "next/navigation";
import {
  updateTenantGoogleCalendarEmbedUrlAction,
  updateTenantTimezoneAction,
} from "@/app/actions";
import { TimezoneSelect } from "@/components/timezone-select";
import {
  AuthorizationError,
  getTenantForUser,
  listAppointmentsForTenant,
  listClientsForTenant,
  NotFoundError,
} from "@/server/clinic-service";
import { formatDateTimeInTimeZone } from "@/server/date-time";
import type {
  Appointment,
  AppointmentStatus,
  Client,
  Tenant,
} from "@/server/models";
import { requireAuthenticatedUser } from "@/server/user-session";

type AppointmentsPageProps = {
  params: Promise<{
    tenantId: string;
  }>;
  searchParams: Promise<{
    view?: string;
    focus?: string;
    from?: string;
    to?: string;
    title?: string;
    client?: string;
    status?: string;
  }>;
};

const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "completed",
  "cancelled",
  "no-show",
];

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

function localDateValue(date: Date, timeZone: string) {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return formatted;
}

function googleDateValue(date: Date, timeZone: string) {
  return localDateValue(date, timeZone).replaceAll("-", "");
}

function buildCalendarEmbedUrl(
  embedUrl: string,
  appointment: Appointment | undefined,
) {
  const url = new URL(embedUrl);

  if (appointment) {
    url.searchParams.set(
      "dates",
      `${googleDateValue(
        appointment.startsAt,
        appointment.timezone,
      )}/${googleDateValue(appointment.endsAt, appointment.timezone)}`,
    );
    url.searchParams.set("mode", "DAY");
  }

  return url.toString();
}

function buildPrimaryCalendarEmbedUrl(email: string, timezone: string) {
  const url = new URL("https://calendar.google.com/calendar/embed");
  url.searchParams.set("src", email);
  url.searchParams.set("ctz", timezone);
  url.searchParams.set("mode", "WEEK");

  return url.toString();
}

function appointmentMatchesFilters(
  appointment: Appointment,
  clients: Client[],
  filters: Awaited<AppointmentsPageProps["searchParams"]>,
) {
  const appointmentTitle = appointment.title.toLowerCase();
  const clientName = clientNameFor(clients, appointment.clientId).toLowerCase();
  const titleFilter = String(filters.title ?? "")
    .trim()
    .toLowerCase();
  const clientFilter = String(filters.client ?? "")
    .trim()
    .toLowerCase();
  const statusFilter = String(filters.status ?? "");
  const appointmentDate = localDateValue(
    appointment.startsAt,
    appointment.timezone,
  );

  if (filters.from && appointmentDate < filters.from) {
    return false;
  }

  if (filters.to && appointmentDate > filters.to) {
    return false;
  }

  if (titleFilter && !appointmentTitle.includes(titleFilter)) {
    return false;
  }

  if (clientFilter && !clientName.includes(clientFilter)) {
    return false;
  }

  if (statusFilter && appointment.status !== statusFilter) {
    return false;
  }

  return true;
}

export default async function AppointmentsPage({
  params,
  searchParams,
}: AppointmentsPageProps) {
  const { tenantId } = await params;
  const filters = await searchParams;
  const activeView = filters.view === "list" ? "list" : "calendar";
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
  const embedUrlAction = updateTenantGoogleCalendarEmbedUrlAction.bind(
    null,
    tenantId,
  );
  const focusedAppointment = appointments.find(
    (appointment) => appointment._id?.toHexString() === filters.focus,
  );
  const baseCalendarEmbedUrl =
    tenant.googleCalendarEmbedUrl ??
    buildPrimaryCalendarEmbedUrl(user.email, timezone);
  const googleCalendarEmbedUrl = buildCalendarEmbedUrl(
    baseCalendarEmbedUrl,
    focusedAppointment,
  );
  const isDerivedPrimaryCalendar = !tenant.googleCalendarEmbedUrl;
  const filteredAppointments = appointments.filter((appointment) =>
    appointmentMatchesFilters(appointment, clients, filters),
  );

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

        <nav className="view-tabs" aria-label="Calendar views">
          <Link
            className={`view-tab ${activeView === "calendar" ? "view-tab--active" : ""}`}
            href={`/tenants/${tenantId}/appointments?view=calendar`}
          >
            Calendar
          </Link>
          <Link
            className={`view-tab ${activeView === "list" ? "view-tab--active" : ""}`}
            href={`/tenants/${tenantId}/appointments?view=list`}
          >
            List
          </Link>
        </nav>

        <div className="toolbar-panel">
          <form className="inline-form" action={timezoneAction}>
            <TimezoneSelect label="Clinic timezone" defaultValue={timezone} />
            <button className="button" type="submit">
              Save
            </button>
          </form>
        </div>

        {activeView === "calendar" ? (
          <div className="calendar-embed-panel">
            <iframe
              className="google-calendar-frame"
              src={googleCalendarEmbedUrl}
              title={`${tenant.name} Google Calendar`}
            />

            <form className="form embed-form" action={embedUrlAction}>
              <label>
                Google Calendar embed URL override
                <input
                  name="googleCalendarEmbedUrl"
                  type="url"
                  placeholder={
                    isDerivedPrimaryCalendar
                      ? `Using ${user.email}`
                      : "https://calendar.google.com/calendar/embed?src=..."
                  }
                  defaultValue={tenant.googleCalendarEmbedUrl ?? ""}
                />
              </label>
              <button className="button" type="submit">
                Save embed
              </button>
            </form>
          </div>
        ) : (
          <>
            <form className="filter-panel" action="" method="get">
              <input type="hidden" name="view" value="list" />
              <label>
                From
                <input
                  name="from"
                  type="date"
                  defaultValue={filters.from ?? ""}
                />
              </label>
              <label>
                To
                <input name="to" type="date" defaultValue={filters.to ?? ""} />
              </label>
              <label>
                Title
                <input
                  name="title"
                  type="search"
                  defaultValue={filters.title ?? ""}
                />
              </label>
              <label>
                Client
                <input
                  name="client"
                  type="search"
                  defaultValue={filters.client ?? ""}
                />
              </label>
              <label>
                Status
                <select name="status" defaultValue={filters.status ?? ""}>
                  <option value="">Any</option>
                  {APPOINTMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button" type="submit">
                Search
              </button>
            </form>

            {filteredAppointments.length > 0 ? (
              <div className="calendar-list">
                {filteredAppointments.map((appointment) => {
                  const appointmentId = appointment._id?.toHexString() ?? "";

                  return (
                    <div className="calendar-item" key={appointmentId}>
                      <time dateTime={appointment.startsAt.toISOString()}>
                        {formatDateTimeInTimeZone(
                          appointment.startsAt,
                          appointment.timezone,
                        )}
                      </time>
                      <div>
                        <strong>{appointment.title}</strong>
                        <small>
                          {clientNameFor(clients, appointment.clientId)}
                        </small>
                      </div>
                      <div className="status-stack">
                        <span
                          className={`status status--${appointment.status}`}
                        >
                          {statusLabel(appointment.status)}
                        </span>
                        <span
                          className={`status status--sync-${appointment.googleCalendarSyncStatus}`}
                        >
                          {syncStatusLabel(
                            appointment.googleCalendarSyncStatus,
                          )}
                        </span>
                      </div>
                      <div className="row-actions">
                        <Link
                          className="button"
                          href={`/tenants/${tenantId}/appointments/${appointmentId}/edit`}
                        >
                          Edit
                        </Link>
                        <Link
                          className="button button--primary"
                          href={`/tenants/${tenantId}/appointments?view=calendar&focus=${appointmentId}`}
                        >
                          View on calendar
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="status-panel">
                <p>No appointments match the current filters.</p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
