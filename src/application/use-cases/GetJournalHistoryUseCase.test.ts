import { describe, it, expect } from "vitest";
import { GetJournalHistoryUseCase } from "./GetJournalHistoryUseCase";
import { JournalEntry } from "../../domain/entities/JournalEntry";
import { LocalDate } from "../../domain/value-objects/LocalDate";
import { JournalRepository } from "../../domain/repositories/JournalRepository";

class InMemoryJournalRepository implements JournalRepository {
  constructor(private readonly entries: JournalEntry[]) {}
  async findByUserIdAndDate(): Promise<JournalEntry | null> {
    return null;
  }
  async findByUserId(userId: string): Promise<JournalEntry[]> {
    return this.entries.filter((e) => e.userId === userId);
  }
  async save(): Promise<void> {}
}

describe("GetJournalHistoryUseCase", () => {
  it("returns only the caller's journal entries", async () => {
    const mine = JournalEntry.create({
      id: "j1",
      userId: "user-1",
      date: LocalDate.create("2026-01-01"),
      text: "Good day.",
    });
    const someoneElses = JournalEntry.create({
      id: "j2",
      userId: "user-2",
      date: LocalDate.create("2026-01-01"),
      text: "Not mine.",
    });
    const useCase = new GetJournalHistoryUseCase(
      new InMemoryJournalRepository([mine, someoneElses]),
    );

    const result = await useCase.execute({ userId: "user-1" });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("j1");
  });
});
