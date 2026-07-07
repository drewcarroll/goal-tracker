import { describe, it, expect } from "vitest";
import { JournalEntry, type JournalEntryProps } from "./JournalEntry";
import { LocalDate } from "../value-objects/LocalDate";
import { ValidationError } from "../errors/DomainError";

const base = {
  id: "journal-1",
  userId: "user-1",
  date: LocalDate.create("2026-07-06"),
  now: new Date("2026-07-07T02:00:00.000Z"),
};

describe("JournalEntry", () => {
  it("creates a fully empty entry — every field is optional", () => {
    const entry = JournalEntry.create(base);
    expect(entry.text).toBeUndefined();
    expect(entry.mood).toBeUndefined();
    expect(entry.photoUrl).toBeUndefined();
  });

  it("creates a fully populated entry", () => {
    const entry = JournalEntry.create({
      ...base,
      text: "Good day overall.",
      mood: 4,
      photoUrl: "https://example.com/photo.jpg",
    });
    expect(entry.text).toBe("Good day overall.");
    expect(entry.mood).toBe(4);
    expect(entry.photoUrl).toBe("https://example.com/photo.jpg");
  });

  it("trims text and treats whitespace-only text as absent", () => {
    expect(JournalEntry.create({ ...base, text: "  hi  " }).text).toBe("hi");
    expect(JournalEntry.create({ ...base, text: "   " }).text).toBeUndefined();
  });

  it("rejects text over the length cap", () => {
    expect(() => JournalEntry.create({ ...base, text: "a".repeat(281) })).toThrow(
      ValidationError,
    );
  });

  it("accepts text at exactly the length cap", () => {
    expect(() => JournalEntry.create({ ...base, text: "a".repeat(280) })).not.toThrow();
  });

  it("rejects a mood outside 1-5", () => {
    expect(() => JournalEntry.create({ ...base, mood: 0 })).toThrow(ValidationError);
    expect(() => JournalEntry.create({ ...base, mood: 6 })).toThrow(ValidationError);
    expect(() => JournalEntry.create({ ...base, mood: 2.5 })).toThrow(ValidationError);
  });

  it("accepts moods at the boundary", () => {
    expect(() => JournalEntry.create({ ...base, mood: 1 })).not.toThrow();
    expect(() => JournalEntry.create({ ...base, mood: 5 })).not.toThrow();
  });

  describe("rehydrate", () => {
    const validProps: JournalEntryProps = {
      id: "journal-1",
      userId: "user-1",
      date: LocalDate.create("2026-07-06"),
      text: "Fine.",
      mood: 3,
      createdAt: new Date("2026-07-07T02:00:00.000Z"),
    };

    it("accepts valid stored state", () => {
      expect(() => JournalEntry.rehydrate(validProps)).not.toThrow();
    });

    it("re-validates invariants on rehydrate", () => {
      expect(() => JournalEntry.rehydrate({ ...validProps, mood: 99 })).toThrow(ValidationError);
    });
  });
});
