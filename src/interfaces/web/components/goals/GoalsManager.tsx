"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { GoalDTO, GoalSuggestionDTO } from "@/application/dtos/GoalDTO";
import { FrequencySlider } from "./FrequencySlider";
import { ChevronRightIcon, CalendarIcon } from "@/interfaces/web/components/icons";
import { createGoalAction } from "@/interfaces/web/app/(app)/goals/actions";

/**
 * Just the list — name, target, cost, tap through for the graph, stats, and
 * edit/pause/delete (simplified 2026-07-18; those all live on /goals/[id]
 * now, not inline on the card). Active goals up top, Paused below; a
 * schedule-tomorrow prompt sits above Active when tomorrow isn't planned
 * yet (user feedback: no path to scheduling from this page).
 */
export function GoalsManager({
  initialGoals,
  suggestions,
  tomorrowPlanned,
}: {
  initialGoals: GoalDTO[];
  suggestions: GoalSuggestionDTO[];
  tomorrowPlanned: boolean;
}) {
  const [goals, setGoals] = useState<GoalDTO[]>(initialGoals);

  function upsert(goal: GoalDTO) {
    setGoals((prev) =>
      prev.some((g) => g.id === goal.id)
        ? prev.map((g) => (g.id === goal.id ? goal : g))
        : [goal, ...prev],
    );
  }

  const active = goals.filter((g) => g.state !== "paused");
  const paused = goals.filter((g) => g.state === "paused");

  return (
    <div className="flex flex-col gap-4">
      <AddGoalForm suggestions={suggestions} onCreated={upsert} />

      {goals.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          No goals yet. Add your first one above.
        </p>
      ) : (
        <>
          {!tomorrowPlanned && active.length > 0 && (
            <Link
              href="/plan"
              className="flex items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-brand/5 px-4 py-3 shadow-sm transition-colors active:bg-brand/10"
            >
              <span className="inline-flex items-center gap-2.5 text-sm font-semibold text-brand">
                <CalendarIcon className="h-4 w-4" />
                Tomorrow isn&apos;t scheduled yet
              </span>
              <ChevronRightIcon className="h-4 w-4 text-brand" />
            </Link>
          )}

          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Active
            </h2>
            <ul className="flex flex-col gap-2">
              {active.map((goal) => (
                <GoalRow key={goal.id} goal={goal} />
              ))}
            </ul>
          </div>
          {paused.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Paused
              </h2>
              <ul className="flex flex-col gap-2">
                {paused.map((goal) => (
                  <GoalRow key={goal.id} goal={goal} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GoalRow({ goal }: { goal: GoalDTO }) {
  const paused = goal.state === "paused";

  return (
    <li>
      <Link
        href={`/goals/${goal.id}`}
        className={`flex items-center justify-between gap-3 rounded-2xl border border-gray-900/[0.06] p-4 shadow-sm transition-colors active:bg-gray-50 ${
          paused ? "bg-gray-50 opacity-70" : "bg-white"
        }`}
      >
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate font-medium text-gray-900">{goal.name}</p>
            {goal.state === "formed" && (
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                Formed
              </span>
            )}
            {!goal.isPublic && (
              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                Private
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-400">{goal.weeklyFrequencyTarget}×/week</p>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <span className="whitespace-nowrap rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">
            {goal.currentLockCost} keys
          </span>
          <ChevronRightIcon className="h-4 w-4 text-gray-300" />
        </span>
      </Link>
    </li>
  );
}

function AddGoalForm({
  suggestions,
  onCreated,
}: {
  suggestions: GoalSuggestionDTO[];
  onCreated: (goal: GoalDTO) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [weeklyFrequencyTarget, setWeeklyFrequencyTarget] = useState(3);
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setWeeklyFrequencyTarget(3);
    setIsPublic(true);
    setError(null);
  }

  function handleSubmit() {
    setError(null);
    if (!name.trim()) {
      setError("Give it a name.");
      return;
    }
    startTransition(async () => {
      const result = await createGoalAction(name, weeklyFrequencyTarget, isPublic);
      if (result.ok) {
        onCreated(result.goal);
        reset();
        setOpen(false);
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
        className="rounded-xl bg-brand px-5 py-3.5 text-center text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
      >
        + Add a goal
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm">
      <div>
        <label htmlFor="new-goal-name" className="mb-1.5 block text-sm font-medium text-gray-700">
          Goal name
        </label>
        <input
          id="new-goal-name"
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-base text-gray-900 shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setName(s.label)}
              className="rounded-full border border-gray-900/[0.06] bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <FrequencySlider value={weeklyFrequencyTarget} onChange={setWeeklyFrequencyTarget} showHint />

      <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-900/[0.06] bg-gray-50/60 px-3.5 py-2.5">
        <span className="min-w-0">
          <span className="block text-sm font-medium text-gray-700">Private goal</span>
          <span className="block text-xs text-gray-400">
            Friends won&apos;t see this goal at all if it&apos;s private.
          </span>
        </span>
        <input
          type="checkbox"
          checked={!isPublic}
          onChange={(e) => setIsPublic(!e.target.checked)}
          className="h-5 w-5 shrink-0 accent-brand"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
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
          {pending ? "Adding…" : "Add goal"}
        </button>
      </div>
    </div>
  );
}
