"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { GoalDTO, GoalSuggestionDTO } from "@/application/dtos/GoalDTO";
import type { GoalStatsDTO } from "@/application/dtos/GoalStatsDTO";
import { FrequencySlider } from "./FrequencySlider";
import { HabitStrengthChart } from "./HabitStrengthChart";
import { ChevronRightIcon } from "@/interfaces/web/components/icons";
import {
  createGoalAction,
  editGoalAction,
  setGoalPausedAction,
  deleteGoalAction,
} from "@/interfaces/web/app/(app)/goals/actions";

export function GoalsManager({
  initialGoals,
  suggestions,
  capacity,
  statsByGoalId,
  today,
}: {
  initialGoals: GoalDTO[];
  suggestions: GoalSuggestionDTO[];
  capacity: number;
  statsByGoalId: Record<string, GoalStatsDTO>;
  today: string;
}) {
  const [goals, setGoals] = useState<GoalDTO[]>(initialGoals);

  function upsert(goal: GoalDTO) {
    setGoals((prev) =>
      prev.some((g) => g.id === goal.id)
        ? prev.map((g) => (g.id === goal.id ? goal : g))
        : [goal, ...prev],
    );
  }

  function remove(goalId: string) {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  }

  const active = goals.filter((g) => g.state !== "paused");
  const paused = goals.filter((g) => g.state === "paused");
  const committed = active.reduce((sum, g) => sum + g.currentLockCost, 0);
  const over = committed > capacity;

  return (
    <div className="flex flex-col gap-4">
      {goals.length > 0 && (
        <div className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-gray-700">This week&apos;s keys</span>
            <span className={`text-sm font-bold ${over ? "text-red-600" : "text-gray-900"}`}>
              {committed} / {capacity}
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-[width] ${
                over ? "bg-red-500" : "bg-gradient-to-r from-brand to-violet-400"
              }`}
              style={{ width: `${Math.min(100, Math.round((committed / capacity) * 100))}%` }}
            />
          </div>
          {over && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              Your goals cost more than {capacity} keys now. Pause or delete one, or lower a
              weekly target, to fit the week.
            </p>
          )}
        </div>
      )}

      <AddGoalForm suggestions={suggestions} onCreated={upsert} />

      {goals.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          No goals yet. Add your first one above.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {active.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                stats={statsByGoalId[goal.id]}
                today={today}
                onUpdated={upsert}
                onDeleted={remove}
              />
            ))}
          </ul>
          {paused.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Paused · not counted this week
              </h2>
              <ul className="flex flex-col gap-2">
                {paused.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    stats={statsByGoalId[goal.id]}
                    today={today}
                    onUpdated={upsert}
                    onDeleted={remove}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  stats,
  today,
  onUpdated,
  onDeleted,
}: {
  goal: GoalDTO;
  stats: GoalStatsDTO | undefined;
  today: string;
  onUpdated: (goal: GoalDTO) => void;
  onDeleted: (goalId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(goal.name);
  const [weeklyFrequencyTarget, setWeeklyFrequencyTarget] = useState(goal.weeklyFrequencyTarget);
  const [isPublic, setIsPublic] = useState(goal.isPublic);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSaveEdit() {
    setError(null);
    startTransition(async () => {
      const result = await editGoalAction(goal.id, name, weeklyFrequencyTarget, isPublic);
      if (result.ok) {
        onUpdated(result.goal);
        setEditing(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handleTogglePause() {
    setError(null);
    startTransition(async () => {
      const result = await setGoalPausedAction(
        goal.id,
        goal.state === "paused" ? "resume" : "pause",
      );
      if (result.ok) {
        onUpdated(result.goal);
      } else {
        setError(result.error);
      }
    });
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteGoalAction(goal.id);
      if (result.ok) {
        onDeleted(goal.id);
      } else {
        setError(result.error);
        setConfirmingDelete(false);
      }
    });
  }

  if (editing) {
    return (
      <li className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-base text-gray-900 shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          <FrequencySlider value={weeklyFrequencyTarget} onChange={setWeeklyFrequencyTarget} />
          <p className="text-xs text-gray-400">
            Lowering the target makes this goal cheaper to hold; raising it costs more. Past
            misses always stay counted either way.
          </p>
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
                setEditing(false);
                setName(goal.name);
                setWeeklyFrequencyTarget(goal.weeklyFrequencyTarget);
                setIsPublic(goal.isPublic);
                setError(null);
              }}
              disabled={pending}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={pending || !name.trim()}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </li>
    );
  }

  const paused = goal.state === "paused";

  return (
    <li
      className={`rounded-2xl border border-gray-900/[0.06] p-4 shadow-sm ${
        paused ? "bg-gray-50 opacity-70" : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
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
        <span className="shrink-0 whitespace-nowrap rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">
          {goal.currentLockCost} keys
        </span>
      </div>

      {stats && (
        <Link
          href={`/goals/${goal.id}`}
          className="mt-3 block rounded-xl border border-gray-900/[0.06] bg-gray-50/60 p-2 transition-colors active:bg-gray-100"
        >
          <div className="pointer-events-none">
            <HabitStrengthChart stats={stats} today={today} compact />
          </div>
          <span className="mt-1 flex items-center justify-between text-xs text-gray-400">
            <span>
              Times completed: <span className="font-medium text-gray-600">{stats.timesCompleted}</span>
            </span>
            <span className="flex items-center gap-0.5 font-medium text-brand">
              View <ChevronRightIcon className="h-3.5 w-3.5" />
            </span>
          </span>
        </Link>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={pending}
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Edit
        </button>
        {goal.state !== "formed" && (
          <button
            type="button"
            onClick={handleTogglePause}
            disabled={pending}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {pending ? "Saving…" : paused ? "Resume" : "Pause"}
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
            confirmingDelete
              ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
              : "border-gray-200 text-red-600 hover:bg-red-50"
          }`}
        >
          {confirmingDelete ? "Confirm delete?" : "Delete"}
        </button>
        {confirmingDelete && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Never mind
          </button>
        )}
      </div>
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
