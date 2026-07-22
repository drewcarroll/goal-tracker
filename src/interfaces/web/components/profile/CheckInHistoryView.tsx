"use client";

import { useState, useTransition } from "react";
import type { GoalDTO } from "@/application/dtos/GoalDTO";
import type { CheckInDTO, GoalMarkDTO } from "@/application/dtos/CheckInDTO";
import type { JournalEntryDTO } from "@/application/dtos/JournalEntryDTO";
import {
  editCheckInAction,
  deleteCheckInAction,
} from "@/interfaces/web/app/(app)/profile/checkInActions";

/** Mood 1-5 as five dots filling warm-to-bright, no emoji (design rule). */
function MoodDots({ mood }: { mood: number }) {
  return (
    <span aria-label={`Mood: ${mood} of 5`} className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => (
        <span
          key={value}
          className={`h-2 w-2 rounded-full ${value <= mood ? "bg-brand" : "bg-gray-200"}`}
        />
      ))}
    </span>
  );
}

/** "2026-01-15" -> "Jan 15" (UTC-parsed to avoid a local-timezone shift). */
function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function CheckInHistoryView({
  checkIns,
  goals,
  journalEntries,
}: {
  checkIns: CheckInDTO[];
  goals: GoalDTO[];
  journalEntries: JournalEntryDTO[];
}) {
  const byId = new Map(goals.map((g) => [g.id, g]));
  const journalByDate = new Map(journalEntries.map((entry) => [entry.date, entry]));
  const sorted = [...checkIns].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <div className="flex flex-col gap-3">
      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          No check-ins yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((checkIn) => (
            <CheckInCard
              key={checkIn.id}
              checkIn={checkIn}
              byId={byId}
              journalEntry={journalByDate.get(checkIn.date)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CheckInCard({
  checkIn,
  byId,
  journalEntry,
}: {
  checkIn: CheckInDTO;
  byId: Map<string, GoalDTO>;
  journalEntry: JournalEntryDTO | undefined;
}) {
  const [editing, setEditing] = useState(false);
  const [marks, setMarks] = useState<Record<string, boolean>>(
    Object.fromEntries(checkIn.marks.map((m) => [m.goalId, m.passed])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(goalId: string) {
    setMarks((prev) => ({ ...prev, [goalId]: !prev[goalId] }));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const payload: GoalMarkDTO[] = Object.entries(marks).map(([goalId, passed]) => ({
        goalId,
        passed,
      }));
      const result = await editCheckInAction(checkIn.date, payload);
      if (result.ok) {
        setEditing(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCheckInAction(checkIn.date);
      if (!result.ok) setError(result.error);
    });
  }

  const passed = checkIn.dayResult === "PASS";

  return (
    <li className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{formatDate(checkIn.date)}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              passed ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {passed ? "Pass" : "Fail"}
          </span>
        </div>
        <div className="flex shrink-0 gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={pending}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={pending}
                className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                disabled={pending}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <ul className="mt-3 flex flex-col gap-1.5">
        {checkIn.marks.map((mark) => {
          const goal = byId.get(mark.goalId);
          const value = editing ? marks[mark.goalId] : mark.passed;
          return (
            <li key={mark.goalId} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{goal?.name ?? "Goal"}</span>
              {editing ? (
                <button
                  type="button"
                  onClick={() => toggle(mark.goalId)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                    value
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-red-300 bg-red-50 text-red-700"
                  }`}
                >
                  {value ? "✓ Passed" : "✗ Missed"}
                </button>
              ) : (
                <span className={value ? "text-emerald-600" : "text-gray-400"}>
                  {value ? "✓" : "✗"}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {journalEntry && (journalEntry.text || journalEntry.mood !== undefined) && (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
          {journalEntry.text && (
            <p className="min-w-0 flex-1 text-sm text-gray-700">{journalEntry.text}</p>
          )}
          {journalEntry.mood !== undefined && <MoodDots mood={journalEntry.mood} />}
        </div>
      )}
    </li>
  );
}
