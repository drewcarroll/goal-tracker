import { describe, it, expect } from "vitest";
import { GetRankUseCase } from "./GetRankUseCase";
import { CheckIn } from "../../domain/entities/CheckIn";
import { LocalDate } from "../../domain/value-objects/LocalDate";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";
import { XP_PER_LOG } from "../../domain/services/RankService";

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
  it("counts only on-time logs; backfills and goal passes are irrelevant", async () => {
    const useCase = new GetRankUseCase(
      new InMemoryCheckInRepository([
        checkIn("2026-01-01", true, false), // failed day, on time: still earns XP
        checkIn("2026-01-02", true, true),
        checkIn("2026-01-03", false, true), // backfilled, all passed: NO XP
      ]),
    );

    const result = await useCase.execute({ userId: "user-1" });

    expect(result.xp).toBe(2 * XP_PER_LOG);
    expect(result.rank).toBe(2); // first log ranked up; 1 XP-log into the 2-log climb
    expect(result.xpIntoRank).toBe(1 * XP_PER_LOG);
    expect(result.xpForRankUp).toBe(2 * XP_PER_LOG);
    expect(result.nextRank).toBe(3);
  });

  it("ranks up on the very first on-time log", async () => {
    const useCase = new GetRankUseCase(new InMemoryCheckInRepository([checkIn("2026-01-01", true)]));

    const result = await useCase.execute({ userId: "user-1" });

    expect(result.rank).toBe(2);
    expect(result.xp).toBe(XP_PER_LOG);
  });

  it("starts a brand-new user at Rank 1 with 0 XP", async () => {
    const useCase = new GetRankUseCase(new InMemoryCheckInRepository([]));

    const result = await useCase.execute({ userId: "user-1" });

    expect(result).toMatchObject({ rank: 1, nextRank: 2, xp: 0, xpPerLog: XP_PER_LOG });
  });
});
