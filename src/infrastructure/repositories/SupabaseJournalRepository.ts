import type { SupabaseClient } from "@supabase/supabase-js";
import { JournalEntry } from "@/domain/entities/JournalEntry";
import { JournalRepository } from "@/domain/repositories/JournalRepository";
import { LocalDate } from "@/domain/value-objects/LocalDate";

const JOURNAL_ENTRIES_TABLE = "journal_entries";

/** Shape of a row in the `journal_entries` table. */
interface JournalEntryRow {
  id: string;
  user_id: string;
  date: string;
  text: string | null;
  mood: number | null;
  photo_url: string | null;
  created_at: string;
}

/**
 * Supabase/PostgreSQL implementation of the JournalRepository port. Contains
 * zero business logic — just row <-> entity mapping.
 */
export class SupabaseJournalRepository implements JournalRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByUserIdAndDate(userId: string, date: LocalDate): Promise<JournalEntry | null> {
    const { data, error } = await this.client
      .from(JOURNAL_ENTRIES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .eq("date", date.toString())
      .maybeSingle();

    if (error) {
      throw new Error(
        `Failed to fetch journal entry for user "${userId}" on "${date.toString()}": ${error.message}`,
      );
    }
    return data ? this.toDomain(data as JournalEntryRow) : null;
  }

  async findByUserId(userId: string): Promise<JournalEntry[]> {
    const { data, error } = await this.client
      .from(JOURNAL_ENTRIES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch journal entries for user "${userId}": ${error.message}`);
    }
    return (data as JournalEntryRow[]).map((row) => this.toDomain(row));
  }

  async save(entry: JournalEntry): Promise<void> {
    const { error } = await this.client.from(JOURNAL_ENTRIES_TABLE).upsert(
      {
        id: entry.id,
        user_id: entry.userId,
        date: entry.date.toString(),
        text: entry.text ?? null,
        mood: entry.mood ?? null,
        photo_url: entry.photoUrl ?? null,
        created_at: entry.createdAt.toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) {
      throw new Error(`Failed to save journal entry "${entry.id}": ${error.message}`);
    }
  }

  private toDomain(row: JournalEntryRow): JournalEntry {
    return JournalEntry.rehydrate({
      id: row.id,
      userId: row.user_id,
      date: LocalDate.create(row.date),
      text: row.text ?? undefined,
      mood: row.mood ?? undefined,
      photoUrl: row.photo_url ?? undefined,
      createdAt: new Date(row.created_at),
    });
  }
}
