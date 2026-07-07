export interface JournalEntryDTO {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  text?: string;
  mood?: number;
  photoUrl?: string;
  createdAt: string; // ISO 8601
}

export interface CreateJournalEntryDTO {
  userId: string;
  date: string; // YYYY-MM-DD
  text?: string;
  mood?: number;
  /**
   * Already-uploaded photo URL. Uploading the file itself is an
   * infrastructure concern (Supabase Storage) handled before this use case
   * runs — see docs/plan.md's Storage bucket task.
   */
  photoUrl?: string;
}
