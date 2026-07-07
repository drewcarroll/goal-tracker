"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { HabitDTO, HabitState } from "@/application/dtos/HabitDTO";
import { setHabitPausedAction } from "@/interfaces/web/app/(app)/settings/actions";

const STATE_BADGE: Record<HabitState, string> = {
  active: "border-brand/20 bg-brand/5 text-brand",
  formed: "border-emerald-300 bg-emerald-50 text-emerald-700",
  paused: "border-gray-300 bg-gray-100 text-gray-500",
};

const STATE_LABEL: Record<HabitState, string> = {
  active: "Active",
  formed: "Formed",
  paused: "Paused",
};

export function SettingsView({ habits: initialHabits }: { habits: HabitDTO[] }) {
  const [habits, setHabits] = useState<HabitDTO[]>(initialHabits);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(habit: HabitDTO) {
    setError(null);
    setPendingId(habit.id);
    const action = habit.state === "paused" ? "resume" : "pause";
    startTransition(async () => {
      const result = await setHabitPausedAction(habit.id, action);
      setPendingId(null);
      if (result.ok) {
        setHabits((prev) => prev.map((h) => (h.id === result.habit.id ? result.habit : h)));
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Habits</h2>

        {error && (
          <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {habits.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-center text-gray-600">
            No habits yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {habits.map((habit) => (
              <li
                key={habit.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{habit.label}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATE_BADGE[habit.state]}`}
                    >
                      {STATE_LABEL[habit.state]}
                    </span>
                    <span className="text-xs text-gray-400">{habit.currentLockCost} locks</span>
                  </div>
                </div>
                {habit.state !== "formed" && (
                  <button
                    type="button"
                    onClick={() => toggle(habit)}
                    disabled={pendingId === habit.id}
                    className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
                  >
                    {pendingId === habit.id
                      ? "Saving…"
                      : habit.state === "paused"
                        ? "Resume"
                        : "Pause"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        href="/onboarding"
        className="rounded-xl border border-gray-300 bg-white px-5 py-3.5 text-center text-base font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-100"
      >
        Add more habits
      </Link>
      <Link
        href="/journal"
        className="rounded-xl border border-gray-300 bg-white px-5 py-3.5 text-center text-base font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-100"
      >
        🔒 Private journal
      </Link>
    </div>
  );
}
