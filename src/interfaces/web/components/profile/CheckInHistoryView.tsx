"use client";

import { useState, useTransition } from "react";
import type { GoalDTO } from "@/application/dtos/GoalDTO";
import type { CheckInDTO, GoalMarkDTO } from "@/application/dtos/CheckInDTO";
import type { JournalEntryDTO } from "@/application/dtos/JournalEntryDTO";
import {
  addPastCheckInAction,
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
  today,
}: {
  checkIns: CheckInDTO[];
  goals: GoalDTO[];
  journalEntries: JournalEntryDTO[];
  today: string;
}) {
  const byId = new Map(goals.map((g) => [g.id, g]));
  const journalByDate = new Map(journalEntries.map((entry) => [entry.date, entry]));
  const sorted = [...checkIns].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const checkedInDates = new Set(checkIns.map((c) => c.date));

  return (
    <div className="flex flex-col gap-3">
      <AddMissedDay goals={goals} today={today} checkedInDates={checkedInDates} />

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

function AddMissedDay({
  goals,
  today,
  checkedInDates,
}: {
  goals: GoalDTO[];
  today: string;
  checkedInDates: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(goalId: string) {
    setSelected((prev) => {
      const next = { ...prev };
      if (goalId in next) delete next[goalId];
      else next[goalId] = true;
      return next;
    });
  }

  function setPassed(goalId: string, passed: boolean) {
    setSelected((prev) => ({ ...prev, [goalId]: passed }));
  }

  function handleSubmit() {
    setError(null);
    if (!date) {
      setError("Pick a date.");
      return;
    }
    if (checkedInDates.has(date)) {
      setError("That day already has a check-in. Edit it below instead.");
      return;
    }
    const marks: GoalMarkDTO[] = Object.entries(selected).map(([goalId, passed]) => ({
      goalId,
      passed,
    }));
    if (marks.length === 0) {
      setError("Mark at least one goal.");
      return;
    }
    startTransition(async () => {
      const result = await addPastCheckInAction(date, marks);
      if (result.ok) {
        setOpen(false);
        setDate("");
        setSelected({});
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
      >
        + Add a missed day
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm">
      <div>
        <label htmlFor="missed-day-date" className="mb-1.5 block text-sm font-medium text-gray-700">
          Date
        </label>
        <input
          id="missed-day-date"
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-base text-gray-900 shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {goals.map((goal) => {
          const chosen = goal.id in selected;
          const passed = selected[goal.id];
          return (
            <div key={goal.id} className="flex items-center justify-between gap-2">
              <label className="flex min-w-0 items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={chosen}
                  onChange={() => toggle(goal.id)}
                  className="h-4 w-4 shrink-0 accent-brand"
                />
                <span className="truncate">{goal.name}</span>
              </label>
              {chosen && (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPassed(goal.id, true)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      passed
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-gray-900/[0.06] bg-white text-gray-400"
                    }`}
                  >
                    Passed
                  </button>
                  <button
                    type="button"
                    onClick={() => setPassed(goal.id, false)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      passed === false
                        ? "border-red-300 bg-red-50 text-red-700"
                        : "border-gray-900/[0.06] bg-white text-gray-400"
                    }`}
                  >
                    Missed
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add check-in"}
        </button>
      </div>
    </div>
  );
}
