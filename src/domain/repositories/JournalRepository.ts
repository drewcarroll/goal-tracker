import { JournalEntry } from "../entities/JournalEntry";
import { LocalDate } from "../value-objects/LocalDate";

export interface JournalRepository {
  findByUserIdAndDate(userId: string, date: LocalDate): Promise<JournalEntry | null>;
  findByUserId(userId: string): Promise<JournalEntry[]>;
  save(entry: JournalEntry): Promise<void>;
}
