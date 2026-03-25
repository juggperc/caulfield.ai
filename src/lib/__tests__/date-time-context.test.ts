import { describe, it, expect } from "vitest";
import { getDateTimeContext } from "../date-time-context";

describe("getDateTimeContext", () => {
  it("returns a string containing 'UTC'", () => {
    const result = getDateTimeContext();
    expect(result).toContain("UTC");
  });

  it("returns a string containing 'Current date/time'", () => {
    const result = getDateTimeContext();
    expect(result).toMatch(/Current date\/time:/i);
  });

  it("includes day of week", () => {
    const result = getDateTimeContext();
    expect(result).toMatch(
      /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/,
    );
  });

  it("includes current year", () => {
    const result = getDateTimeContext();
    const currentYear = new Date().getUTCFullYear().toString();
    expect(result).toContain(currentYear);
  });

  it("returns consistent format", () => {
    const result = getDateTimeContext();
    expect(result).toMatch(
      /^Current date\/time: \w+, .+, \d{4}, \d{1,2}:\d{2} [AP]M UTC\. Current year: \d{4}\.$/,
    );
  });
});