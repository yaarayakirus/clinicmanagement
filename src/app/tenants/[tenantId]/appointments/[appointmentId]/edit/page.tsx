import Link from "next/link";
import { notFound } from "next/navigation";
import {
  cancelAppointmentAction,
  updateAppointmentAction,
} from "@/app/actions";
import { AppointmentForm } from "@/components/appointment-form";
import {
  AuthorizationError,
  getAppointmentDetailForUser,
  getTenantForUser,
  listClientsForTenant,
  listPractitionersForTenant,
  NotFoundError,
} from "@/server/clinic-service";
import type {
  Appointment,
  Client,
  PractitionerOption,
  Tenant,
} from "@/server/models";
import { requireAuthenticatedUser } from "@/server/user-session";

type EditAppointmentPageProps = {
  params: Promise<{
    tenantId: string;
    appointmentId: string;
  }>;
};

export default async function EditAppointmentPage({
  params,
}: EditAppointmentPageProps) {
  const { tenantId, appointmentId } = await params;
  const user = await requireAuthenticatedUser();
  let tenant: Tenant;
  let appointment: Appointment;
  let clients: Client[];
  let practitioners: PractitionerOption[];

  try {
    [tenant, appointment, clients, practitioners] = await Promise.all([
      getTenantForUser(user.id, tenantId),
      getAppointmentDetailForUser(user.id, tenantId, appointmentId),
      listClientsForTenant(user.id, tenantId),
      listPractitionersForTenant(user.id, tenantId),
    ]);
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }

  const updateAction = updateAppointmentAction.bind(
    null,
    tenantId,
    appointmentId,
  );
  const cancelAction = cancelAppointmentAction.bind(
    null,
    tenantId,
    appointmentId,
  );
  const syncStatus =
    appointment.googleCalendarSyncStatus === "not_configured"
      ? "Calendar not connected"
      : `Calendar ${appointment.googleCalendarSyncStatus}`;

  return (
    <main className="page-shell">
      <section className="form-page" aria-labelledby="page-title">
        <div className="section-heading">
          <div>
            <p className="home__eyebrow">{tenant.name}</p>
            <h1 id="page-title">Edit appointment</h1>
          </div>
          <Link className="button" href={`/tenants/${tenantId}/appointments`}>
            Calendar
          </Link>
        </div>

        <div className="toolbar-panel">
          <span
            className={`status status--sync-${appointment.googleCalendarSyncStatus}`}
          >
            {syncStatus}
          </span>
        </div>

        <AppointmentForm
          action={updateAction}
          tenant={tenant}
          clients={clients}
          practitioners={practitioners}
          appointment={appointment}
          submitLabel="Save appointment"
        />

        {appointment.status !== "cancelled" ? (
          <form className="danger-zone" action={cancelAction}>
            <button className="button button--danger" type="submit">
              Cancel appointment
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
