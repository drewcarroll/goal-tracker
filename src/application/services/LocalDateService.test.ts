import { describe, it, expect } from "vitest";
import { LocalDateService } from "./LocalDateService";
import { Clock } from "../ports/Clock";

describe("LocalDateService", () => {
  it("derives today for a timezone behind UTC", () => {
    // 2026-07-06 03:00 UTC is still 2026-07-05 evening in Los Angeles.
    const clock: Clock = { now: () => new Date("2026-07-06T03:00:00.000Z") };
    const service = new LocalDateService(clock);

    expect(service.today("America/Los_Angeles")).toBe("2026-07-05");
  });

  it("derives tomorrow as one day after today", () => {
    const clock: Clock = { now: () => new Date("2026-07-06T12:00:00.000Z") };
    const service = new LocalDateService(clock);

    expect(service.today("UTC")).toBe("2026-07-06");
    expect(service.tomorrow("UTC")).toBe("2026-07-07");
  });

  it("rolls tomorrow over a month boundary", () => {
    const clock: Clock = { now: () => new Date("2026-07-31T12:00:00.000Z") };
    const service = new LocalDateService(clock);

    expect(service.tomorrow("UTC")).toBe("2026-08-01");
  });
});
