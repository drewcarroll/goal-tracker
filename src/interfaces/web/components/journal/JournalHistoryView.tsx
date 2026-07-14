import type { JournalEntryDTO } from "@/application/dtos/JournalEntryDTO";

const MOOD_EMOJI: Record<number, string> = { 1: "😞", 2: "🙁", 3: "😐", 4: "🙂", 5: "😄" };

/** "2026-01-15" -> "Jan 15" (UTC-parsed to avoid a local-timezone shift). */
function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Chronological (most recent first) list of private journal entries.
 * Read-only — entries are written from the check-in flow's optional
 * screen 2, not edited here.
 */
export function JournalHistoryView({ entries }: { entries: JournalEntryDTO[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="text-gray-600">No entries yet.</p>
        <p className="mt-1 text-sm text-gray-500">
          You&apos;ll get the option to add one each time you check in.
        </p>
      </div>
    );
  }

  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((entry) => (
        <li key={entry.id} className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-gray-900">{formatDate(entry.date)}</span>
            {entry.mood !== undefined && (
              <span aria-label={`Mood: ${entry.mood} of 5`} className="text-lg">
                {MOOD_EMOJI[entry.mood]}
              </span>
            )}
          </div>
          {entry.text && <p className="mt-2 text-sm text-gray-700">{entry.text}</p>}
        </li>
      ))}
    </ul>
  );
}
