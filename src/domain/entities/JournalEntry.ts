import { ValidationError } from "../errors/DomainError";
import { LocalDate } from "../value-objects/LocalDate";

const MAX_TEXT_LENGTH = 280;
const MIN_MOOD = 1;
const MAX_MOOD = 5;

export interface JournalEntryProps {
  id: string;
  userId: string;
  /** The user-local day this entry is for. */
  date: LocalDate;
  /** A 1-2 sentence private note. Optional — the whole entry is optional. */
  text?: string;
  /** 1 (worst) to 5 (best). Optional. */
  mood?: number;
  /** One photo per day, if attached. Optional. */
  photoUrl?: string;
  createdAt: Date;
}

/**
 * JournalEntry entity — the private, optional reflection attached to a day's
 * check-in. Never shown to anyone but the user; nothing here feeds the
 * lock-cost trajectory or any stats. Has identity. Enforces its own
 * invariants and knows nothing about persistence or transport.
 */
export class JournalEntry {
  private constructor(private readonly props: JournalEntryProps) {}

  static create(params: {
    id: string;
    userId: string;
    date: LocalDate;
    text?: string;
    mood?: number;
    photoUrl?: string;
    now?: Date;
  }): JournalEntry {
    JournalEntry.assertValidText(params.text);
    JournalEntry.assertValidMood(params.mood);
    return new JournalEntry({
      id: params.id,
      userId: params.userId,
      date: params.date,
      text: params.text?.trim() || undefined,
      mood: params.mood,
      photoUrl: params.photoUrl,
      createdAt: params.now ?? new Date(),
    });
  }

  static rehydrate(props: JournalEntryProps): JournalEntry {
    JournalEntry.assertValidText(props.text);
    JournalEntry.assertValidMood(props.mood);
    return new JournalEntry(props);
  }

  private static assertValidText(text: string | undefined): void {
    if (text !== undefined && text.trim().length > MAX_TEXT_LENGTH) {
      throw new ValidationError(`Journal text must be ${MAX_TEXT_LENGTH} characters or fewer.`);
    }
  }

  private static assertValidMood(mood: number | undefined): void {
    if (mood === undefined) return;
    if (!Number.isInteger(mood) || mood < MIN_MOOD || mood > MAX_MOOD) {
      throw new ValidationError(`Mood must be an integer between ${MIN_MOOD} and ${MAX_MOOD}.`);
    }
  }

  // --- Getters (read-only access to state) ---

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get date(): LocalDate {
    return this.props.date;
  }
  get text(): string | undefined {
    return this.props.text;
  }
  get mood(): number | undefined {
    return this.props.mood;
  }
  get photoUrl(): string | undefined {
    return this.props.photoUrl;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
