import type {
  Appointment,
  AppointmentStatus,
  Client,
  PractitionerOption,
  Tenant,
} from "@/server/models";
import { toDateTimeLocalValue } from "@/server/date-time";
import { TimezoneSelect } from "@/components/timezone-select";

const STATUS_OPTIONS: AppointmentStatus[] = [
  "scheduled",
  "completed",
  "cancelled",
  "no-show",
];

type AppointmentFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  tenant: Tenant;
  clients: Client[];
  practitioners: PractitionerOption[];
  appointment?: Appointment;
  submitLabel: string;
};

export function AppointmentForm({
  action,
  tenant,
  clients,
  practitioners,
  appointment,
  submitLabel,
}: AppointmentFormProps) {
  const timezone =
    appointment?.timezone ?? tenant.timezone ?? "America/New_York";
  const startsAtLocal = appointment
    ? toDateTimeLocalValue(appointment.startsAt, timezone)
    : "";
  const durationMinutes = appointment
    ? Math.max(
        15,
        Math.round(
          (appointment.endsAt.getTime() - appointment.startsAt.getTime()) /
            60000,
        ),
      )
    : 60;

  return (
    <form className="form" action={action}>
      <label>
        Client
        <select
          name="clientId"
          required
          defaultValue={appointment?.clientId ?? ""}
        >
          <option value="" disabled>
            Select client
          </option>
          {clients.map((client) => (
            <option
              key={client._id?.toHexString()}
              value={client._id?.toHexString()}
            >
              {client.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Title
        <input
          name="title"
          required
          defaultValue={appointment?.title ?? "Appointment"}
        />
      </label>

      <div className="form-grid">
        <label>
          Starts
          <input
            name="startsAtLocal"
            type="datetime-local"
            required
            defaultValue={startsAtLocal}
          />
        </label>

        <label>
          Duration
          <input
            name="durationMinutes"
            type="number"
            min={15}
            step={15}
            required
            defaultValue={durationMinutes}
          />
        </label>
      </div>

      <div className="form-grid">
        <label>
          Practitioner
          <select
            name="practitionerMembershipId"
            defaultValue={appointment?.practitionerMembershipId ?? ""}
          >
            <option value="">Unassigned</option>
            {practitioners.map((practitioner) => (
              <option
                key={practitioner.membershipId}
                value={practitioner.membershipId}
              >
                {practitioner.name} ({practitioner.role})
              </option>
            ))}
          </select>
        </label>

        <label>
          Status
          <select
            name="status"
            required
            defaultValue={appointment?.status ?? "scheduled"}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <TimezoneSelect defaultValue={timezone} />
      </div>

      <label>
        Notes
        <textarea
          name="notes"
          rows={4}
          defaultValue={appointment?.notes ?? ""}
        />
      </label>

      <button className="button button--primary" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
