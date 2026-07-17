import { describe, it, expect } from "vitest";
import { BattlePassCalendarService } from "./BattlePassCalendarService";
import { DeterministicRewardService } from "./DeterministicRewardService";
import { getBattlePassMonthDefinition } from "../value-objects/BattlePassCalendarMap";
import { DEFAULT_ECONOMY_CONFIG } from "../value-objects/EconomyConfig";

describe("BattlePassCalendarService", () => {
  const service = new BattlePassCalendarService(new DeterministicRewardService());
  const july2026 = getBattlePassMonthDefinition(2026, 7)!;

  it("daysInMonth handles a 31-day month and February in a non-leap year", () => {
    expect(service.daysInMonth(2026, 7)).toBe(31);
    expect(service.daysInMonth(2027, 2)).toBe(28);
    expect(service.daysInMonth(2028, 2)).toBe(29); // leap year
  });

  describe("visibleDayCount (truncation math)", () => {
    it("shows every day with zero misses", () => {
      expect(service.visibleDayCount(31, 0)).toBe(31);
    });

    it("truncates one day off the end per miss", () => {
      expect(service.visibleDayCount(31, 5)).toBe(26);
    });

    it("floors at 0, never goes negative", () => {
      expect(service.visibleDayCount(31, 40)).toBe(0);
    });
  });

  describe("countMisses", () => {
    it("counts only past days with no on-time check-in, ignoring future days", () => {
      const onTime = new Set(["2026-07-01", "2026-07-03"]);
      const misses = service.countMisses({
        year: 2026,
        month: 7,
        todayDate: "2026-07-05",
        onTimeCheckInDates: onTime,
      });
      // 1..5, missing on 07-02, 07-04, 07-05 -> 3 misses; 06-31 never counted.
      expect(misses).toBe(3);
    });

    it("returns 0 for a future month (no days have happened yet)", () => {
      const misses = service.countMisses({
        year: 2027,
        month: 6,
        todayDate: "2026-07-05",
        onTimeCheckInDates: new Set(),
      });
      expect(misses).toBe(0);
    });

    it("counts every day of a fully-elapsed past month", () => {
      const misses = service.countMisses({
        year: 2026,
        month: 7,
        todayDate: "2026-08-15",
        onTimeCheckInDates: new Set(),
      });
      expect(misses).toBe(31);
    });
  });

  describe("buildCalendar", () => {
    it("only renders cells 1..visibleDayCount — truncated days are absent, not marked failed", () => {
      const cells = service.buildCalendar({
        year: 2026,
        month: 7,
        missesSoFar: 29, // visible = 31 - 29 = 2
        monthDefinition: july2026,
        claimedDates: new Set(),
        todayDate: "2026-07-31",
        userId: "user-1",
        economyConfig: DEFAULT_ECONOMY_CONFIG,
      });
      expect(cells).toHaveLength(2);
      expect(cells.map((c) => c.day)).toEqual([1, 2]);
    });

    it("places a trinket reward on days 5/10/15/20/25 and coins elsewhere", () => {
      const cells = service.buildCalendar({
        year: 2026,
        month: 7,
        missesSoFar: 0,
        monthDefinition: july2026,
        claimedDates: new Set(),
        todayDate: "2026-07-31",
        userId: "user-1",
        economyConfig: DEFAULT_ECONOMY_CONFIG,
      });
      const trinketDays = cells.filter((c) => c.kind === "trinket").map((c) => c.day);
      expect(trinketDays).toEqual([5, 10, 15, 20, 25]);
      expect(cells.filter((c) => c.kind === "coins")).toHaveLength(26);
    });

    it("marks a claimed date as claimed and not claimable", () => {
      const cells = service.buildCalendar({
        year: 2026,
        month: 7,
        missesSoFar: 0,
        monthDefinition: july2026,
        claimedDates: new Set(["2026-07-01"]),
        todayDate: "2026-07-05",
        userId: "user-1",
        economyConfig: DEFAULT_ECONOMY_CONFIG,
      });
      const day1 = cells.find((c) => c.day === 1)!;
      expect(day1.claimed).toBe(true);
      expect(day1.claimable).toBe(false);
    });

    it("a future day (past today) is not claimable", () => {
      const cells = service.buildCalendar({
        year: 2026,
        month: 7,
        missesSoFar: 0,
        monthDefinition: july2026,
        claimedDates: new Set(),
        todayDate: "2026-07-05",
        userId: "user-1",
        economyConfig: DEFAULT_ECONOMY_CONFIG,
      });
      const day10 = cells.find((c) => c.day === 10)!;
      expect(day10.claimable).toBe(false);
    });

    it("is deterministic: the same (userId, date) always rolls the same coin amount", () => {
      const buildOnce = () =>
        service.buildCalendar({
          year: 2026,
          month: 7,
          missesSoFar: 0,
          monthDefinition: july2026,
          claimedDates: new Set(),
          todayDate: "2026-07-31",
          userId: "user-1",
          economyConfig: DEFAULT_ECONOMY_CONFIG,
        });
      const first = buildOnce().find((c) => c.day === 1);
      const second = buildOnce().find((c) => c.day === 1);
      expect(first).toEqual(second);
    });
  });
});
