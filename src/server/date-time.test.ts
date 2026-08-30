import { describe, expect, it } from "vitest";
import {
  formatDateTimeInTimeZone,
  normalizeTimezone,
  parseDateTimeLocalInTimeZone,
  toDateTimeLocalValue,
} from "@/server/date-time";

describe("timezone helpers", () => {
  it("normalizes invalid timezone input to the app default", () => {
    expect(normalizeTimezone("not-a-zone")).toBe("America/New_York");
  });

  it("converts local clinic time to a UTC instant", () => {
    expect(
      parseDateTimeLocalInTimeZone(
        "2026-09-01T10:00",
        "America/New_York",
      ).toISOString(),
    ).toBe("2026-09-01T14:00:00.000Z");
  });

  it("formats and serializes a UTC instant in the clinic timezone", () => {
    const date = new Date("2026-09-01T14:00:00.000Z");

    expect(toDateTimeLocalValue(date, "America/New_York")).toBe(
      "2026-09-01T10:00",
    );
    expect(formatDateTimeInTimeZone(date, "America/New_York")).toContain(
      "10:00 AM",
    );
  });
});
