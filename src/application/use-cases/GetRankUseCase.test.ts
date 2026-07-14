import { describe, it, expect } from "vitest";
import { GetRankUseCase } from "./GetRankUseCase";
import { CheckIn } from "../../domain/entities/CheckIn";
import { LocalDate } from "../../domain/value-objects/LocalDate";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";

class InMemoryCheckInRepository implements CheckInRepository {
  constructor(private readonly checkIns: CheckIn[]) {}
  async findByUserIdAndDate(): Promise<CheckIn | null> {
    return null;
  }
  async findByUserId(userId: string): Promise<CheckIn[]> {
    return this.checkIns.filter((c) => c.userId === userId);
  }
  async save(): Promise<void> {}
  async delete(): Promise<void> {}
}

function checkIn(date: string, submittedOnTime: boolean, passed = false) {
  return CheckIn.create({
    id: `c-${date}`,
    userId: "user-1",
    date: LocalDate.create(date),
    marks: [{ goalId: "g1", passed }],
    submittedOnTime,
  });
}

describe("GetRankUseCase", () => {
  it("counts only on-time logs — backfills and goal passes are irrelevant", async () => {
    const useCase = new GetRankUseCase(
      new InMemoryCheckInRepository([
        checkIn("2026-01-01", true, false), // failed day, on time → still a point
        checkIn("2026-01-02", true, true),
        checkIn("2026-01-03", false, true), // backfilled, all passed → NO point
      ]),
    );

    const result = await useCase.execute({ userId: "user-1" });

    expect(result.points).toBe(2);
    expect(result.rank).toBe(1); // next threshold is 3
    expect(result.nextThreshold).toBe(3);
  });

  it("ranks up at the thresholds", async () => {
    const checkIns = ["01", "02", "03"].map((d) => checkIn(`2026-01-${d}`, true));
    const useCase = new GetRankUseCase(new InMemoryCheckInRepository(checkIns));

    const result = await useCase.execute({ userId: "user-1" });

    expect(result.points).toBe(3);
    expect(result.rank).toBe(2);
    expect(result.nextThreshold).toBe(7);
  });

  it("starts a brand-new user at Rank 1 with 0 points", async () => {
    const useCase = new GetRankUseCase(new InMemoryCheckInRepository([]));

    const result = await useCase.execute({ userId: "user-1" });

    expect(result).toMatchObject({ points: 0, rank: 1, nextThreshold: 3 });
    expect(result.maxRank).toBeGreaterThan(10);
  });
});
