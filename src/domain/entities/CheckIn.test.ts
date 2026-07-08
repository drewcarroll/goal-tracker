import { describe, it, expect } from "vitest";
import { CheckIn, type CheckInProps } from "./CheckIn";
import { LocalDate } from "../value-objects/LocalDate";
import { ValidationError } from "../errors/DomainError";

const base = {
  id: "checkin-1",
  userId: "user-1",
  date: LocalDate.create("2026-07-06"),
  now: new Date("2026-07-07T02:00:00.000Z"),
};

describe("CheckIn", () => {
  it("derives PASS when every marked goal passed", () => {
    const checkIn = CheckIn.create({
      ...base,
      marks: [
        { goalId: "goal-1", passed: true },
        { goalId: "goal-2", passed: true },
      ],
    });
    expect(checkIn.dayResult).toBe("PASS");
  });

  it("derives FAIL when any marked goal missed", () => {
    const checkIn = CheckIn.create({
      ...base,
      marks: [
        { goalId: "goal-1", passed: true },
        { goalId: "goal-2", passed: false },
      ],
    });
    expect(checkIn.dayResult).toBe("FAIL");
  });

  it("rejects an empty mark list", () => {
    expect(() => CheckIn.create({ ...base, marks: [] })).toThrow(ValidationError);
  });

  it("rejects duplicate marks for the same goal", () => {
    expect(() =>
      CheckIn.create({
        ...base,
        marks: [
          { goalId: "goal-1", passed: true },
          { goalId: "goal-1", passed: false },
        ],
      }),
    ).toThrow(ValidationError);
  });

  it("looks up the mark for a specific goal", () => {
    const checkIn = CheckIn.create({
      ...base,
      marks: [
        { goalId: "goal-1", passed: true },
        { goalId: "goal-2", passed: false },
      ],
    });
    expect(checkIn.markFor("goal-1")).toBe(true);
    expect(checkIn.markFor("goal-2")).toBe(false);
    expect(checkIn.markFor("goal-3")).toBeUndefined();
  });

  describe("rehydrate", () => {
    const validProps: CheckInProps = {
      id: "checkin-1",
      userId: "user-1",
      date: LocalDate.create("2026-07-06"),
      marks: [{ goalId: "goal-1", passed: true }],
      createdAt: new Date("2026-07-07T02:00:00.000Z"),
    };

    it("accepts valid stored state", () => {
      expect(() => CheckIn.rehydrate(validProps)).not.toThrow();
    });

    it("re-validates invariants on rehydrate", () => {
      expect(() => CheckIn.rehydrate({ ...validProps, marks: [] })).toThrow(ValidationError);
    });
  });
});
