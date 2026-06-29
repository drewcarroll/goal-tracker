import { describe, it, expect } from "vitest";
import { Goal } from "../../domain/entities/Goal";
import { GoalMapper } from "./GoalMapper";

// A 10-week session anchored on a Monday: Jan 5 -> Mar 16 (UTC), exclusive end.
const start = new Date("2026-01-05T00:00:00.000Z");
const end = new Date("2026-03-16T00:00:00.000Z");
const today = new Date("2026-01-05T00:00:00.000Z");

describe("GoalMapper — weekly target is never scaled", () => {
  it("maps the entered weekly rate through verbatim and derives the total", () => {
    const goal = Goal.create({
      id: "goal-1",
      userId: "user-1",
      sessionId: "session-1",
      name: "Read books",
      weeklyTarget: 7, // 7 per week
      unit: "pages",
      startDate: start,
      endDate: end,
      now: today,
    });

    const dto = GoalMapper.toDTO(goal, today);

    expect(dto.totalWeeks).toBe(10);
    expect(dto.weeklyTarget).toBe(7); // what the user typed — NOT ×10 or ÷10
    expect(dto.targetValue).toBe(70); // derived total: 7 × 10 weeks
  });
});
