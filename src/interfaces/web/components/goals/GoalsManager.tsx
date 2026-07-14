"use client";

import { useState, useTransition } from "react";
import type { GoalDTO, GoalDifficulty, GoalState } from "@/application/dtos/GoalDTO";
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

const STATE_BADGE: Record<GoalState, string> = {
  active: "border-brand/20 bg-brand/5 text-brand",
  formed: "border-emerald-300 bg-emerald-50 text-emerald-700",
  paused: "border-gray-300 bg-gray-100 text-gray-500",
};

const STATE_LABEL: Record<GoalState, string> = {
  active: "Active",
  formed: "Formed",
  paused: "Paused",
};

export function GoalsManager({
  initialGoals,
  suggestions,
}: {
  initialGoals: GoalDTO[];
  suggestions: GoalSuggestionDTO[];
}) {
  const [goals, setGoals] = useState<GoalDTO[]>(initialGoals);

  function upsert(goal: GoalDTO) {
    setGoals((prev) =>
      prev.some((g) => g.id === goal.id) ? prev.map((g) => (g.id === goal.id ? goal : g)) : [goal, ...prev],
    );
  }

  function remove(goalId: string) {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  }

  return (
    <div className="flex flex-col gap-4">
      <AddGoalForm suggestions={suggestions} onCreated={upsert} />

      {goals.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          No goals yet. Add your first one above.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onUpdated={upsert} onDeleted={remove} />
          ))}
        </ul>
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
      const result = await setGoalPausedAction(goal.id, goal.state === "paused" ? "resume" : "pause");
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

  const difficulty = DIFFICULTIES.find((d) => d.value === goal.difficulty)!;

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
            Lowering the target makes this goal cheaper to schedule and forgives past misses that
            would have fit the easier week. Raising it does the opposite.
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

  return (
    <li className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{goal.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATE_BADGE[goal.state]}`}>
              {STATE_LABEL[goal.state]}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${difficulty.classes}`}>
              {difficulty.label}
            </span>
            <span className="text-xs text-gray-400">{goal.weeklyFrequencyTarget}x/week</span>
            <span className="text-xs text-gray-400">· {goal.currentLockCost} locks</span>
          </div>
        </div>
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
            {pending ? "Saving…" : goal.state === "paused" ? "Resume" : "Pause"}
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
          What are you committing to?
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
                difficulty === d.value ? d.classes : "border-gray-900/[0.06] bg-white text-gray-400 hover:bg-gray-50"
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
