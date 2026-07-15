"use client";

import { useState, useTransition } from "react";
import type { GoalDTO, GoalDifficulty } from "@/application/dtos/GoalDTO";
import type { GoalSuggestionDTO } from "@/application/dtos/GoalDTO";
import { FrequencySlider } from "./FrequencySlider";
import {
  createGoalAction,
  editGoalAction,
  setGoalPausedAction,
  deleteGoalAction,
} from "@/interfaces/web/app/(app)/goals/actions";

const DIFFICULTIES: { value: GoalDifficulty; label: string; classes: string }[] = [
  { value: "easy", label: "Easy", classes: "border-green-300 bg-green-50 text-green-800" },
  { value: "medium", label: "Medium", classes: "border-amber-300 bg-amber-50 text-amber-800" },
  { value: "hard", label: "Hard", classes: "border-orange-300 bg-orange-50 text-orange-800" },
];

export function GoalsManager({
  initialGoals,
  suggestions,
  capacity,
}: {
  initialGoals: GoalDTO[];
  suggestions: GoalSuggestionDTO[];
  capacity: number;
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
            <span className="text-sm font-medium text-gray-700">This week&apos;s locks</span>
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
              Your goals cost more than {capacity} locks now. Pause or delete one, or lower a
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
              <GoalCard key={goal.id} goal={goal} onUpdated={upsert} onDeleted={remove} />
            ))}
          </ul>
          {paused.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Paused · not counted this week
              </h2>
              <ul className="flex flex-col gap-2">
                {paused.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onUpdated={upsert} onDeleted={remove} />
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
  onUpdated,
  onDeleted,
}: {
  goal: GoalDTO;
  onUpdated: (goal: GoalDTO) => void;
  onDeleted: (goalId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(goal.name);
  const [weeklyFrequencyTarget, setWeeklyFrequencyTarget] = useState(goal.weeklyFrequencyTarget);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSaveEdit() {
    setError(null);
    startTransition(async () => {
      const result = await editGoalAction(goal.id, name, weeklyFrequencyTarget);
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setName(goal.name);
                setWeeklyFrequencyTarget(goal.weeklyFrequencyTarget);
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
          </div>
          <p className="mt-0.5 text-xs text-gray-400">{goal.weeklyFrequencyTarget}×/week</p>
        </div>
        <span className="shrink-0 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">
          {goal.currentLockCost} locks
        </span>
      </div>

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
  const [difficulty, setDifficulty] = useState<GoalDifficulty>("medium");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setWeeklyFrequencyTarget(3);
    setDifficulty("medium");
    setError(null);
  }

  function handleSubmit() {
    setError(null);
    if (!name.trim()) {
      setError("Give it a name.");
      return;
    }
    startTransition(async () => {
      const result = await createGoalAction(name, weeklyFrequencyTarget, difficulty);
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

      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-700">
          How hard do you think this will be to accomplish?
        </p>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDifficulty(d.value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                difficulty === d.value
                  ? d.classes
                  : "border-gray-900/[0.06] bg-white text-gray-400 hover:bg-gray-50"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

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
