import { describe, expect, it } from "vitest";
import { getSupportedTimezones } from "@/lib/timezones";

describe("getSupportedTimezones", () => {
  it("includes standard worldwide IANA timezones", () => {
    const timezones = getSupportedTimezones();

    expect(timezones).toContain("America/New_York");
    expect(timezones).toContain("Europe/London");
    expect(timezones).toContain("Asia/Tokyo");
    expect(timezones).toContain("Australia/Sydney");
  });
});
