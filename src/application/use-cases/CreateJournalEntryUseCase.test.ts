import { describe, it, expect } from "vitest";
import { CreateJournalEntryUseCase } from "./CreateJournalEntryUseCase";
import { JournalEntry } from "../../domain/entities/JournalEntry";
import { JournalRepository } from "../../domain/repositories/JournalRepository";
import { Clock } from "../ports/Clock";
import { IdGenerator } from "../ports/IdGenerator";

class InMemoryJournalRepository implements JournalRepository {
  public readonly saved: JournalEntry[] = [];
  async findByUserIdAndDate(): Promise<JournalEntry | null> {
    return null;
  }
  async findByUserId(): Promise<JournalEntry[]> {
    return [];
  }
  async save(entry: JournalEntry): Promise<void> {
    this.saved.push(entry);
  }
}

const NOW = new Date("2026-01-21T02:00:00.000Z");
const fixedClock: Clock = { now: () => NOW };
const fixedIds: IdGenerator = { generate: () => "journal-1" };

describe("CreateJournalEntryUseCase", () => {
  it("creates an entry with every optional field", async () => {
    const repo = new InMemoryJournalRepository();
    const useCase = new CreateJournalEntryUseCase(repo, fixedIds, fixedClock);

    const result = await useCase.execute({
      userId: "user-1",
      date: "2026-01-20",
      text: "Good day.",
      mood: 4,
      photoUrl: "https://example.com/photo.jpg",
    });

    expect(result).toMatchObject({
      id: "journal-1",
      text: "Good day.",
      mood: 4,
      photoUrl: "https://example.com/photo.jpg",
    });
    expect(repo.saved).toHaveLength(1);
  });

  it("creates a fully empty entry", async () => {
    const repo = new InMemoryJournalRepository();
    const useCase = new CreateJournalEntryUseCase(repo, fixedIds, fixedClock);

    const result = await useCase.execute({ userId: "user-1", date: "2026-01-20" });

    expect(result.text).toBeUndefined();
    expect(result.mood).toBeUndefined();
    expect(result.photoUrl).toBeUndefined();
  });

  it("rejects an out-of-range mood", async () => {
    const useCase = new CreateJournalEntryUseCase(
      new InMemoryJournalRepository(),
      fixedIds,
      fixedClock,
    );

    await expect(
      useCase.execute({ userId: "user-1", date: "2026-01-20", mood: 10 }),
    ).rejects.toThrow();
  });
});
