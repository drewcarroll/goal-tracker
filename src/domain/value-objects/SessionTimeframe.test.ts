import { describe, it, expect } from "vitest";
import { SessionTimeframe } from "./SessionTimeframe";
import { ValidationError } from "../errors/DomainError";

// A clean 4-week session: Jan 1 (UTC) through Jan 29 (UTC), exclusive end.
const start = new Date("2026-01-01T00:00:00.000Z");
const end = new Date("2026-01-29T00:00:00.000Z"); // start + 28 days = 4 weeks
const tf = SessionTimeframe.create({ start, end });

describe("SessionTimeframe.create", () => {
  it("rejects an end on or before the start", () => {
    expect(() => SessionTimeframe.create({ start, end: start })).toThrow(ValidationError);
    expect(() =>
      SessionTimeframe.create({ start, end: new Date("2025-12-31T00:00:00.000Z") }),
    ).toThrow(ValidationError);
  });

  it("rejects invalid dates", () => {
    expect(() => SessionTimeframe.create({ start: new Date("nope"), end })).toThrow(
      ValidationError,
    );
  });

  it("does not retain references to the caller's Date objects", () => {
    const mutableEnd = new Date(end.getTime());
    const built = SessionTimeframe.create({ start, end: mutableEnd });
    mutableEnd.setFullYear(2099);
    expect(built.totalWeeks()).toBe(4);
  });
});

describe("totalWeeks (AC #1)", () => {
  it("counts an exact multiple of 7 days as that many weeks", () => {
    expect(tf.totalWeeks()).toBe(4);
  });

  it("rounds a partial trailing week up to a full bucket", () => {
    const partial = SessionTimeframe.create({
      start,
      end: new Date("2026-01-30T00:00:00.000Z"), // 29 days -> 5 buckets
    });
    expect(partial.totalWeeks()).toBe(5);
  });

  it("treats a sub-week session as a single bucket", () => {
    const short = SessionTimeframe.create({
      start,
      end: new Date("2026-01-04T00:00:00.000Z"), // 3 days
    });
    expect(short.totalWeeks()).toBe(1);
  });
});

describe("currentWeekIndex relative to today (AC #2)", () => {
  it("is 0 on the start instant", () => {
    expect(tf.weekIndexOn(start)).toBe(0);
  });

  it("advances one index per elapsed week", () => {
    expect(tf.weekIndexOn(new Date("2026-01-07T23:59:59.000Z"))).toBe(0); // still week 0
    expect(tf.weekIndexOn(new Date("2026-01-08T00:00:00.000Z"))).toBe(1); // boundary -> week 1
    expect(tf.weekIndexOn(new Date("2026-01-15T12:00:00.000Z"))).toBe(2);
    expect(tf.weekIndexOn(new Date("2026-01-22T00:00:00.000Z"))).toBe(3);
  });
});

describe("remainingWeeks (AC #3)", () => {
  it("counts the current week as remaining and decreases over time", () => {
    expect(tf.remainingWeeksOn(start)).toBe(4); // week 0 of 4 -> 4 left
    expect(tf.remainingWeeksOn(new Date("2026-01-08T00:00:00.000Z"))).toBe(3); // week 1 -> 3 left
    expect(tf.remainingWeeksOn(new Date("2026-01-22T00:00:00.000Z"))).toBe(1); // week 3 -> 1 left
  });
});

describe("session boundaries (AC #4)", () => {
  it("handles a date before the session start", () => {
    const before = new Date("2025-12-25T00:00:00.000Z");
    expect(tf.phaseOn(before)).toBe("before");
    expect(tf.weekIndexOn(before)).toBe(0); // clamped to first week
    expect(tf.remainingWeeksOn(before)).toBe(4); // whole session still ahead
  });

  it("handles a date after the session end", () => {
    const after = new Date("2026-02-15T00:00:00.000Z");
    expect(tf.phaseOn(after)).toBe("after");
    expect(tf.weekIndexOn(after)).toBe(3); // clamped to last week index
    expect(tf.remainingWeeksOn(after)).toBe(0);
  });

  it("treats the exclusive end instant as 'after'", () => {
    expect(tf.phaseOn(end)).toBe("after");
    expect(tf.remainingWeeksOn(end)).toBe(0);
  });

  it("treats the start instant as 'active'", () => {
    expect(tf.phaseOn(start)).toBe("active");
  });
});

describe("derive", () => {
  it("returns all derivations together for an in-progress week", () => {
    expect(tf.derive(new Date("2026-01-16T00:00:00.000Z"))).toEqual({
      totalWeeks: 4,
      currentWeekIndex: 2,
      remainingWeeks: 2,
      phase: "active",
    });
  });

  it("is internally consistent at the boundaries", () => {
    const before = tf.derive(new Date("2025-12-01T00:00:00.000Z"));
    expect(before).toEqual({
      totalWeeks: 4,
      currentWeekIndex: 0,
      remainingWeeks: 4,
      phase: "before",
    });

    const after = tf.derive(new Date("2026-03-01T00:00:00.000Z"));
    expect(after).toEqual({
      totalWeeks: 4,
      currentWeekIndex: 3,
      remainingWeeks: 0,
      phase: "after",
    });
  });
});

describe("weekRange", () => {
  it("returns the [start, end) bounds of a full week bucket", () => {
    expect(tf.weekRange(0)).toEqual({
      start: new Date("2026-01-01T00:00:00.000Z"),
      end: new Date("2026-01-08T00:00:00.000Z"),
    });
    expect(tf.weekRange(2)).toEqual({
      start: new Date("2026-01-15T00:00:00.000Z"),
      end: new Date("2026-01-22T00:00:00.000Z"),
    });
  });

  it("truncates the final bucket to the session end", () => {
    // A 10-day session: 1 full week + a 3-day tail (ceil -> 2 weeks).
    const partial = SessionTimeframe.create({
      start: new Date("2026-01-01T00:00:00.000Z"),
      end: new Date("2026-01-11T00:00:00.000Z"),
    });
    expect(partial.totalWeeks()).toBe(2);
    expect(partial.weekRange(1)).toEqual({
      start: new Date("2026-01-08T00:00:00.000Z"),
      end: new Date("2026-01-11T00:00:00.000Z"),
    });
  });

  it("rejects an index outside the session", () => {
    expect(() => tf.weekRange(-1)).toThrow(ValidationError);
    expect(() => tf.weekRange(4)).toThrow(ValidationError); // only weeks 0..3 exist
    expect(() => tf.weekRange(1.5)).toThrow(ValidationError);
  });
});

describe("equals", () => {
  it("compares by value", () => {
    expect(tf.equals(SessionTimeframe.create({ start, end }))).toBe(true);
    expect(
      tf.equals(SessionTimeframe.create({ start, end: new Date("2026-02-05T00:00:00.000Z") })),
    ).toBe(false);
  });
});
