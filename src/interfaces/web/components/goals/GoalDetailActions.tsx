"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GoalDTO } from "@/application/dtos/GoalDTO";
import { FrequencySlider } from "./FrequencySlider";
import {
  editGoalAction,
  setGoalPausedAction,
  deleteGoalAction,
} from "@/interfaces/web/app/(app)/goals/actions";

/** Edit / pause-resume / delete for one goal — lives on its detail page, not the list. */
export function GoalDetailActions({ goal }: { goal: GoalDTO }) {
  const router = useRouter();
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
        setEditing(false);
        router.refresh();
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
        router.refresh();
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
        router.push("/goals");
      } else {
        setError(result.error);
        setConfirmingDelete(false);
      }
    });
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-base text-gray-900 shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <FrequencySlider value={weeklyFrequencyTarget} onChange={setWeeklyFrequencyTarget} />
        <p className="text-xs text-gray-400">
          Lowering the target makes this goal cheaper to hold; raising it costs more. Past misses
          always stay counted either way.
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
    );
  }

  const paused = goal.state === "paused";

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={pending}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Edit
        </button>
        {goal.state !== "formed" && (
          <button
            type="button"
            onClick={handleTogglePause}
            disabled={pending}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {pending ? "Saving…" : paused ? "Resume" : "Pause"}
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
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
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Never mind
          </button>
        )}
      </div>
    </div>
  );
}
