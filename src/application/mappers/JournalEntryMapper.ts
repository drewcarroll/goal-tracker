import { JournalEntry } from "@/domain/entities/JournalEntry";
import { JournalEntryDTO } from "../dtos/JournalEntryDTO";

export class JournalEntryMapper {
  static toDTO(entry: JournalEntry): JournalEntryDTO {
    return {
      id: entry.id,
      userId: entry.userId,
      date: entry.date.toString(),
      text: entry.text,
      mood: entry.mood,
      photoUrl: entry.photoUrl,
      createdAt: entry.createdAt.toISOString(),
    };
  }
}
