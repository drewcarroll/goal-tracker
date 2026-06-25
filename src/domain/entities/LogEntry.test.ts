import { describe, it, expect } from "vitest";
import { LogEntry } from "./LogEntry";
import { ValidationError } from "../errors/DomainError";

const base = {
  id: "log-1",
  goalId: "goal-1",
  userId: "user-1",
  weekIndex: 2,
  value: 3,
  now: new Date("2026-01-16T00:00:00.000Z"),
};

describe("LogEntry", () => {
  it("creates a valid entry and exposes it", () => {
    const log = LogEntry.create(base);
    expect(log.id).toBe("log-1");
    expect(log.goalId).toBe("goal-1");
    expect(log.userId).toBe("user-1");
    expect(log.weekIndex).toBe(2);
    expect(log.value).toBe(3);
    expect(log.createdAt).toEqual(base.now);
  });

  it("projects to the lightweight weekly shape", () => {
    const log = LogEntry.create(base);
    expect(log.toWeekly()).toEqual({ weekIndex: 2, value: 3 });
  });

  it("rejects non-positive values", () => {
    expect(() => LogEntry.create({ ...base, value: 0 })).toThrow(ValidationError);
    expect(() => LogEntry.create({ ...base, value: -1 })).toThrow(ValidationError);
  });

  it("rejects non-finite values", () => {
    expect(() => LogEntry.create({ ...base, value: Number.NaN })).toThrow(ValidationError);
  });

  it("rejects negative or non-integer week indexes", () => {
    expect(() => LogEntry.create({ ...base, weekIndex: -1 })).toThrow(ValidationError);
    expect(() => LogEntry.create({ ...base, weekIndex: 1.5 })).toThrow(ValidationError);
  });
});
