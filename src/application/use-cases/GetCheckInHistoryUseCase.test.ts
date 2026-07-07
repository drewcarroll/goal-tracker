import { describe, it, expect } from "vitest";
import { GetCheckInHistoryUseCase } from "./GetCheckInHistoryUseCase";
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

describe("GetCheckInHistoryUseCase", () => {
  it("returns only the caller's check-ins", async () => {
    const mine = CheckIn.create({
      id: "c1",
      userId: "user-1",
      date: LocalDate.create("2026-01-01"),
      marks: [{ habitId: "h1", passed: true }],
    });
    const someoneElses = CheckIn.create({
      id: "c2",
      userId: "user-2",
      date: LocalDate.create("2026-01-01"),
      marks: [{ habitId: "h2", passed: true }],
    });
    const useCase = new GetCheckInHistoryUseCase(
      new InMemoryCheckInRepository([mine, someoneElses]),
    );

    const result = await useCase.execute({ userId: "user-1" });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("c1");
  });
});
