import { describe, it, expect } from "vitest";
import { CheckInWindowResolver } from "./CheckInWindowResolver";
import {
  UserSettingsRepository,
  type UserSettings,
} from "../../domain/repositories/UserSettingsRepository";
import { DEFAULT_CHECKIN_WINDOW } from "../../domain/services/CheckInWindowService";
import { Clock } from "../ports/Clock";

class StubSettingsRepository implements UserSettingsRepository {
  constructor(private readonly window = { ...DEFAULT_CHECKIN_WINDOW }) {}
  async findByUserId(userId: string): Promise<UserSettings> {
    return { userId, checkInWindow: this.window };
  }
  async save(): Promise<void> {}
}

function resolverAt(instant: string, window?: { start: string; end: string }) {
  const clock: Clock = { now: () => new Date(instant) };
  return new CheckInWindowResolver(new StubSettingsRepository(window), clock);
}

describe("CheckInWindowResolver", () => {
  it("is open for today during the evening", async () => {
    const result = await resolverAt("2026-07-10T20:00:00.000Z").resolve("user-1", "UTC");
    expect(result).toMatchObject({ open: true, targetDate: "2026-07-10" });
  });

  it("maps a past-midnight submission to YESTERDAY's date", async () => {
    const result = await resolverAt("2026-07-11T01:30:00.000Z").resolve("user-1", "UTC");
    expect(result).toMatchObject({ open: true, targetDate: "2026-07-10" });
  });

  it("is closed mid-morning, reporting when it reopens", async () => {
    const result = await resolverAt("2026-07-10T09:00:00.000Z").resolve("user-1", "UTC");
    expect(result).toMatchObject({ open: false, opensAt: "14:00", closedAt: "07:00" });
  });

  it("evaluates the wall clock in the USER'S timezone, not UTC", async () => {
    // 02:00 UTC = 20:00 the previous evening in Denver (UTC-6 in July).
    const result = await resolverAt("2026-07-11T02:00:00.000Z").resolve(
      "user-1",
      "America/Denver",
    );
    expect(result).toMatchObject({ open: true, targetDate: "2026-07-10" });
  });

  it("honors a user-adjusted window", async () => {
    // 08:00 local is past the default 07:00 deadline but inside a 10:00 one.
    const result = await resolverAt("2026-07-11T08:00:00.000Z", {
      start: "14:00",
      end: "10:00",
    }).resolve("user-1", "UTC");
    expect(result).toMatchObject({ open: true, targetDate: "2026-07-10" });
  });
});
