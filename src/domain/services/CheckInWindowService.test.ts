import { describe, expect, it } from "vitest";
import { CheckInWindowService, DEFAULT_CHECKIN_WINDOW } from "./CheckInWindowService";
import { LocalDate } from "../value-objects/LocalDate";
import { ValidationError } from "../errors/DomainError";

const service = new CheckInWindowService();
const july10 = LocalDate.create("2026-07-10");

function minutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h! * 60 + m!;
}

describe("CheckInWindowService", () => {
  describe("resolve with the default 14:00–07:00 window", () => {
    it("is open for TODAY from 14:00 through midnight", () => {
      for (const t of ["14:00", "18:30", "23:59"]) {
        const result = service.resolve(july10, minutes(t), DEFAULT_CHECKIN_WINDOW);
        expect(result).toEqual({ open: true, targetDate: july10 });
      }
    });

    it("is open for YESTERDAY between midnight and the deadline (up-past-midnight case)", () => {
      for (const t of ["00:00", "01:00", "06:59"]) {
        const result = service.resolve(july10, minutes(t), DEFAULT_CHECKIN_WINDOW);
        expect(result.open).toBe(true);
        if (result.open) {
          expect(result.targetDate.toString()).toBe("2026-07-09");
        }
      }
    });

    it("closes at exactly the deadline — 07:00 has missed last night's log", () => {
      for (const t of ["07:00", "07:01", "10:00", "13:59"]) {
        const result = service.resolve(july10, minutes(t), DEFAULT_CHECKIN_WINDOW);
        expect(result).toEqual({ open: false, opensAt: "14:00", closedAt: "07:00" });
      }
    });

    it("opens at exactly the start time", () => {
      const before = service.resolve(july10, minutes("13:59"), DEFAULT_CHECKIN_WINDOW);
      const at = service.resolve(july10, minutes("14:00"), DEFAULT_CHECKIN_WINDOW);
      expect(before.open).toBe(false);
      expect(at.open).toBe(true);
    });
  });

  describe("custom windows", () => {
    it("respects a user-adjusted window (e.g. 16:00–05:00)", () => {
      const window = { start: "16:00", end: "05:00" };
      expect(service.resolve(july10, minutes("15:00"), window).open).toBe(false);
      expect(service.resolve(july10, minutes("16:00"), window).open).toBe(true);
      expect(service.resolve(july10, minutes("04:59"), window).open).toBe(true);
      expect(service.resolve(july10, minutes("05:00"), window).open).toBe(false);
    });
  });

  describe("assertValidWindow", () => {
    it("accepts afternoon starts and morning ends", () => {
      expect(() =>
        CheckInWindowService.assertValidWindow({ start: "12:00", end: "11:59" }),
      ).not.toThrow();
      expect(() =>
        CheckInWindowService.assertValidWindow({ start: "23:00", end: "00:00" }),
      ).not.toThrow();
    });

    it("rejects a start before noon (would make the day mapping ambiguous)", () => {
      expect(() =>
        CheckInWindowService.assertValidWindow({ start: "11:00", end: "07:00" }),
      ).toThrow(ValidationError);
    });

    it("rejects an end at or after noon", () => {
      expect(() =>
        CheckInWindowService.assertValidWindow({ start: "14:00", end: "12:00" }),
      ).toThrow(ValidationError);
    });

    it("rejects malformed times", () => {
      expect(() =>
        CheckInWindowService.assertValidWindow({ start: "2pm", end: "07:00" }),
      ).toThrow(ValidationError);
      expect(() =>
        CheckInWindowService.assertValidWindow({ start: "25:00", end: "07:00" }),
      ).toThrow(ValidationError);
    });
  });
});
