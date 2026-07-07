import { describe, it, expect } from "vitest";
import { LocalDate } from "./LocalDate";
import { ValidationError } from "../errors/DomainError";

describe("LocalDate", () => {
  it("creates from a valid YYYY-MM-DD string and round-trips via toString", () => {
    expect(LocalDate.create("2026-07-06").toString()).toBe("2026-07-06");
  });

  it("rejects malformed strings", () => {
    expect(() => LocalDate.create("2026/07/06")).toThrow(ValidationError);
    expect(() => LocalDate.create("07-06-2026")).toThrow(ValidationError);
    expect(() => LocalDate.create("2026-7-6")).toThrow(ValidationError);
    expect(() => LocalDate.create("")).toThrow(ValidationError);
  });

  it("rejects calendar-invalid dates", () => {
    expect(() => LocalDate.create("2026-02-30")).toThrow(ValidationError);
    expect(() => LocalDate.create("2026-13-01")).toThrow(ValidationError);
    expect(() => LocalDate.create("2026-00-10")).toThrow(ValidationError);
  });

  it("accepts a leap day on a leap year", () => {
    expect(() => LocalDate.create("2024-02-29")).not.toThrow();
  });

  it("rejects a leap day on a non-leap year", () => {
    expect(() => LocalDate.create("2026-02-29")).toThrow(ValidationError);
  });

  it("compares equality by value", () => {
    expect(LocalDate.create("2026-07-06").equals(LocalDate.create("2026-07-06"))).toBe(true);
    expect(LocalDate.create("2026-07-06").equals(LocalDate.create("2026-07-07"))).toBe(false);
  });

  describe("todayInTimezone", () => {
    it("derives the local calendar day for a timezone behind UTC", () => {
      // 2026-07-06 03:00 UTC is still 2026-07-05 evening in Los Angeles (UTC-7 in July).
      const now = new Date("2026-07-06T03:00:00.000Z");
      expect(LocalDate.todayInTimezone(now, "America/Los_Angeles").toString()).toBe(
        "2026-07-05",
      );
    });

    it("derives the local calendar day for a timezone ahead of UTC", () => {
      // 2026-07-06 22:00 UTC is already 2026-07-07 in Tokyo (UTC+9).
      const now = new Date("2026-07-06T22:00:00.000Z");
      expect(LocalDate.todayInTimezone(now, "Asia/Tokyo").toString()).toBe("2026-07-07");
    });

    it("rejects an unrecognized timezone", () => {
      expect(() => LocalDate.todayInTimezone(new Date(), "Not/AZone")).toThrow(ValidationError);
    });
  });

  it("orders chronologically", () => {
    const earlier = LocalDate.create("2026-07-06");
    const later = LocalDate.create("2026-07-07");
    expect(earlier.isBefore(later)).toBe(true);
    expect(later.isAfter(earlier)).toBe(true);
    expect(earlier.isAfter(later)).toBe(false);
  });
});
