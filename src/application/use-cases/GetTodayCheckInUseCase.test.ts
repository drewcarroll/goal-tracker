import { describe, it, expect } from "vitest";
import { GetTodayCheckInUseCase } from "./GetTodayCheckInUseCase";
import { CheckIn } from "../../domain/entities/CheckIn";
import { LocalDate } from "../../domain/value-objects/LocalDate";
import { CheckInRepository } from "../../domain/repositories/CheckInRepository";

class InMemoryCheckInRepository implements CheckInRepository {
  constructor(private readonly checkIns: CheckIn[]) {}
  async findByUserIdAndDate(userId: string, date: LocalDate): Promise<CheckIn | null> {
    return this.checkIns.find((c) => c.userId === userId && c.date.equals(date)) ?? null;
  }
  async findByUserId(userId: string): Promise<CheckIn[]> {
    return this.checkIns.filter((c) => c.userId === userId);
  }
  async save(): Promise<void> {}
  async delete(): Promise<void> {}
}

describe("GetTodayCheckInUseCase", () => {
  it("returns the check-in for that user-local day", async () => {
    const checkIn = CheckIn.create({
      id: "checkin-1",
      userId: "user-1",
      date: LocalDate.create("2026-01-21"),
      marks: [{ goalId: "g1", passed: true }],
    });
    const useCase = new GetTodayCheckInUseCase(new InMemoryCheckInRepository([checkIn]));

    const result = await useCase.execute({ userId: "user-1", date: "2026-01-21" });

    expect(result?.id).toBe("checkin-1");
  });

  it("returns null when no check-in exists for that day", async () => {
    const useCase = new GetTodayCheckInUseCase(new InMemoryCheckInRepository([]));

    const result = await useCase.execute({ userId: "user-1", date: "2026-01-21" });

    expect(result).toBeNull();
  });
});
