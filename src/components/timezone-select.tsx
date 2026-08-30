"use client";

import { useMemo, useState } from "react";
import { FALLBACK_TIMEZONE, getSupportedTimezones } from "@/lib/timezones";

type TimezoneSelectProps = {
  name?: string;
  label?: string;
  defaultValue?: string | null;
  useSystemDefault?: boolean;
  required?: boolean;
};

function getSystemTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIMEZONE;
}

export function TimezoneSelect({
  name = "timezone",
  label = "Timezone",
  defaultValue,
  useSystemDefault = false,
  required = true,
}: TimezoneSelectProps) {
  const initialValue = defaultValue || FALLBACK_TIMEZONE;
  const [selectedTimezone, setSelectedTimezone] = useState(() => {
    if (useSystemDefault && !defaultValue && typeof window !== "undefined") {
      return getSystemTimezone();
    }

    return initialValue;
  });

  const timezoneOptions = useMemo(() => {
    const options = new Set<string>(getSupportedTimezones());

    if (defaultValue) {
      options.add(defaultValue);
    }

    options.add(selectedTimezone);

    return Array.from(options).sort((left, right) => left.localeCompare(right));
  }, [defaultValue, selectedTimezone]);

  return (
    <label>
      {label}
      <select
        name={name}
        required={required}
        value={selectedTimezone}
        onChange={(event) => setSelectedTimezone(event.target.value)}
      >
        {timezoneOptions.map((timezone) => (
          <option key={timezone} value={timezone}>
            {timezone.replace("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
