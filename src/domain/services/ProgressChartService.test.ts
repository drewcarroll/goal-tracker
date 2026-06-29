import { describe, it, expect } from "vitest";
import { ProgressChartService } from "./ProgressChartService";
import { ProjectionService, WeeklyLogEntry } from "./ProjectionService";
import { SessionTimeframe } from "../value-objects/SessionTimeframe";

const projectionService = new ProjectionService();
const chartService = new ProgressChartService();

// A 5-week session anchored on a Monday: Jan 5 -> Feb 9 (UTC), exclusive end
// (35 days = 5 Mon–Sun weeks).
const start = new Date("2026-01-05T00:00:00.000Z");
const end = new Date("2026-02-09T00:00:00.000Z");
const timeframe = SessionTimeframe.create({ start, end });

// Weekly target of 10 over a 5-week session -> total of 50.
const weeklyTarget = 10;

// "today" sits in week index 2 (Jan 19 onward, before Jan 26).
const inWeek3 = new Date("2026-01-20T00:00:00.000Z");

function chartFor(today: Date, logs: WeeklyLogEntry[]) {
  return chartService.build(projectionService.project({ timeframe, weeklyTarget, today, logs }));
}

describe("ProgressChartService — mid-session", () => {
  // Weeks 0,1 are past (under target); week 2 is current; weeks 3,4 future.
  const logs: WeeklyLogEntry[] = [
    { weekIndex: 0, value: 6 }, // past, under 10
    { weekIndex: 1, value: 8 }, // past, under 10
    { weekIndex: 2, value: 4 }, // current, partial
  ];
  const chart = chartFor(inWeek3, logs);

  it("carries the weekly target and totals (AC #2)", () => {
    expect(chart.weeklyTarget).toBe(10);
    expect(chart.totalWeeks).toBe(5);
    expect(chart.targetTotal).toBe(50);
    // 6 + 8 + max(10,4) + 10 + 10 = 44
    expect(chart.projectedTotal).toBe(44);
  });

  it("returns per-week logged totals and the flat weekly target line (AC #1, #2)", () => {
    expect(chart.weeks.map((w) => w.weeklyActual)).toEqual([6, 8, 4, 0, 0]);
    expect(chart.weeks.every((w) => w.weeklyTarget === 10)).toBe(true);
  });

  it("builds a cumulative target line that reaches the target (AC #2)", () => {
    expect(chart.weeks.map((w) => w.cumulativeTarget)).toEqual([10, 20, 30, 40, 50]);
  });

  it("accumulates actuals through the current week, then nulls the future (AC #3)", () => {
    // running: 6, 14, 18 through the current week; future weeks have no data yet.
    expect(chart.weeks.map((w) => w.cumulativeActual)).toEqual([6, 14, 18, null, null]);
  });

  it("accumulates the projected series across the whole session (AC #3)", () => {
    // running contributions: 6, 14, 24 (current at target), 34, 44
    expect(chart.weeks.map((w) => w.cumulativeProjected)).toEqual([6, 14, 24, 34, 44]);
    expect(chart.weeks.at(-1)?.cumulativeProjected).toBe(chart.projectedTotal);
  });

  it("tags week kinds from the projection", () => {
    expect(chart.weeks.map((w) => w.kind)).toEqual(["past", "past", "current", "future", "future"]);
  });
});

describe("ProgressChartService — boundaries", () => {
  it("before the session, no actuals have accrued yet", () => {
    const chart = chartFor(new Date("2025-12-05T00:00:00.000Z"), []);
    // Week 0 is treated as current (non-future) so it carries a 0 actual; rest null.
    expect(chart.weeks.map((w) => w.cumulativeActual)).toEqual([0, null, null, null, null]);
    expect(chart.projectedTotal).toBe(50); // 5 * 10
  });

  it("after the session, every week has a cumulative actual and the lines converge", () => {
    const logs: WeeklyLogEntry[] = [
      { weekIndex: 0, value: 6 },
      { weekIndex: 1, value: 8 },
      { weekIndex: 2, value: 4 },
    ];
    const chart = chartFor(new Date("2026-03-05T00:00:00.000Z"), logs);
    expect(chart.weeks.map((w) => w.cumulativeActual)).toEqual([6, 14, 18, 18, 18]);
    // With no padding once ended, projected equals actual.
    expect(chart.weeks.map((w) => w.cumulativeProjected)).toEqual([6, 14, 18, 18, 18]);
    expect(chart.projectedTotal).toBe(18);
  });
});
