const DEFAULT_TIMEZONE = "America/New_York";

function getDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

export function normalizeTimezone(timezone: string | undefined | null): string {
  const value = String(timezone ?? "").trim();

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function parseDateTimeLocalInTimeZone(
  value: string,
  timeZone: string,
): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

  if (!match) {
    throw new Error("Appointment date and time is required");
  }

  const [, year, month, day, hour, minute] = match.map(Number);
  const normalizedTimeZone = normalizeTimezone(timeZone);
  let utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));

  for (let index = 0; index < 3; index += 1) {
    const parts = getDateParts(utcGuess, normalizedTimeZone);
    const asUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
    );
    const expectedUtc = Date.UTC(year, month - 1, day, hour, minute);

    utcGuess = new Date(utcGuess.getTime() + expectedUtc - asUtc);
  }

  return utcGuess;
}

export function formatDateTimeInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: normalizeTimezone(timeZone),
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function toDateTimeLocalValue(date: Date, timeZone: string): string {
  const parts = getDateParts(date, normalizeTimezone(timeZone));
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(
    parts.hour,
  )}:${pad(parts.minute)}`;
}
