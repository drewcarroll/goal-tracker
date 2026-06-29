import { describe, it, expect } from "vitest";
import { ProjectionService, WeeklyLogEntry } from "./ProjectionService";
import { SessionTimeframe } from "../value-objects/SessionTimeframe";
import { ValidationError } from "../errors/DomainError";

const service = new ProjectionService();

// A 5-week session anchored on a Monday: Jan 5 -> Feb 9 (UTC), exclusive end
// (35 days = 5 Mon–Sun weeks).
const start = new Date("2026-01-05T00:00:00.000Z");
const end = new Date("2026-02-09T00:00:00.000Z");
const timeframe = SessionTimeframe.create({ start, end });

// Weekly target of 10 over a 5-week session -> total of 50.
const weeklyTarget = 10;

// "Week 3": today sits in week index 2 (Jan 19 onward, before Jan 26).
const inWeek3 = new Date("2026-01-20T00:00:00.000Z");

describe("ProjectionService — week-3 example (AC #5)", () => {
  // Weeks 1-2 (index 0,1) under target; week 3 (index 2) is current; rest future.
  const logs: WeeklyLogEntry[] = [
    { weekIndex: 0, value: 2 }, // two logs in week 1 accumulate to 6 (under 10)
    { weekIndex: 0, value: 4 },
    { weekIndex: 1, value: 8 }, // under 10
    { weekIndex: 2, value: 4 }, // current week, partial so far (under 10)
  ];

  const projection = service.project({ timeframe, weeklyTarget, today: inWeek3, logs });

  it("carries the weekly target through and counts the weeks", () => {
    expect(projection.weeklyTarget).toBe(10);
    expect(projection.totalWeeks).toBe(5);
  });

  it("past weeks contribute their actual logged totals (AC #1)", () => {
    expect(projection.weeks[0]).toMatchObject({
      weekIndex: 0,
      actual: 6,
      contribution: 6,
      kind: "past",
    });
    expect(projection.weeks[1]).toMatchObject({
      weekIndex: 1,
      actual: 8,
      contribution: 8,
      kind: "past",
    });
  });

  it("current and future weeks contribute at least the weekly target (AC #2)", () => {
    expect(projection.weeks[2]).toMatchObject({
      weekIndex: 2,
      actual: 4,
      contribution: 10, // current week stays at the target until you exceed it
      kind: "current",
    });
    expect(projection.weeks[3]).toMatchObject({
      weekIndex: 3,
      actual: 0,
      contribution: 10,
      kind: "future",
    });
    expect(projection.weeks[4]).toMatchObject({
      weekIndex: 4,
      actual: 0,
      contribution: 10,
      kind: "future",
    });
  });

  it("projects 6 + 8 + 10 + 10 + 10 = 44", () => {
    expect(projection.total).toBe(44);
  });
});

describe("over-delivery is a bonus, never a penalty (AC #3)", () => {
  const logs: WeeklyLogEntry[] = [
    { weekIndex: 0, value: 15 }, // past week OVER target -> bonus kept
    { weekIndex: 1, value: 8 }, // past week under target -> stays at actual
    { weekIndex: 2, value: 12 }, // current week OVER target -> bonus kept
  ];

  const projection = service.project({ timeframe, weeklyTarget, today: inWeek3, logs });

  it("keeps over-delivery from a past week", () => {
    expect(projection.weeks[0]?.contribution).toBe(15);
  });

  it("keeps over-delivery from the current week", () => {
    expect(projection.weeks[2]?.contribution).toBe(12);
  });

  it("adds the bonus to the total rather than capping at target", () => {
    // 15 + 8 + 12 + 10 + 10 = 55  (> the 50 target because of the bonuses)
    expect(projection.total).toBe(55);
  });
});

describe("recalculates when the goal is edited (AC #4)", () => {
  const logs: WeeklyLogEntry[] = [
    { weekIndex: 0, value: 6 },
    { weekIndex: 1, value: 8 },
    { weekIndex: 2, value: 4 },
  ];
  const base = service.project({ timeframe, weeklyTarget, today: inWeek3, logs });

  it("changes when the target changes", () => {
    const doubled = service.project({ timeframe, weeklyTarget: 20, today: inWeek3, logs });
    // weekly target 20: past 6 + 8, then current/future at 20 each -> 6+8+20+20+20 = 74
    expect(doubled.weeklyTarget).toBe(20);
    expect(doubled.total).toBe(74);
    expect(doubled.total).not.toBe(base.total);
  });

  it("changes when the timeframe changes", () => {
    // Extend to 10 weeks; the weekly target stays 10 (it's the source of truth),
    // so the projection grows. Today is still in week index 2.
    const longer = SessionTimeframe.create({ start, end: new Date("2026-03-16T00:00:00.000Z") });
    const projection = service.project({ timeframe: longer, weeklyTarget, today: inWeek3, logs });
    // past 6 + 8; current at target 10; seven future weeks at 10 = 70 -> 6+8+10+70 = 94
    expect(projection.totalWeeks).toBe(10);
    expect(projection.weeklyTarget).toBe(10);
    expect(projection.total).toBe(94);
    expect(projection.total).not.toBe(base.total);
  });

  it("ignores logs left outside the range after the timeframe is shortened", () => {
    const shorter = SessionTimeframe.create({ start, end: new Date("2026-01-26T00:00:00.000Z") }); // 3 weeks
    const withStale: WeeklyLogEntry[] = [...logs, { weekIndex: 4, value: 999 }];
    const projection = service.project({
      timeframe: shorter,
      weeklyTarget,
      today: inWeek3,
      logs: withStale,
    });
    expect(projection.totalWeeks).toBe(3);
    expect(projection.weeks).toHaveLength(3); // no week 4 contribution
  });
});

describe("session boundaries", () => {
  const logs: WeeklyLogEntry[] = [
    { weekIndex: 0, value: 6 },
    { weekIndex: 1, value: 8 },
    { weekIndex: 2, value: 4 },
  ];

  it("before the session, every week is projected at the weekly target", () => {
    const projection = service.project({
      timeframe,
      weeklyTarget,
      today: new Date("2025-12-05T00:00:00.000Z"),
      logs: [],
    });
    expect(projection.weeks.every((w) => w.kind !== "past")).toBe(true);
    expect(projection.total).toBe(50); // weekly 10 × 5 weeks
  });

  it("after the session ends, the total is exactly the actual logged sum", () => {
    const projection = service.project({
      timeframe,
      weeklyTarget,
      today: new Date("2026-03-05T00:00:00.000Z"),
      logs,
    });
    expect(projection.weeks.every((w) => w.kind === "past")).toBe(true);
    expect(projection.total).toBe(18); // 6 + 8 + 4, no target padding
  });
});

describe("validation", () => {
  it("rejects a negative weekly target", () => {
    expect(() => service.project({ timeframe, weeklyTarget: -1, today: inWeek3, logs: [] })).toThrow(
      ValidationError,
    );
  });
});
