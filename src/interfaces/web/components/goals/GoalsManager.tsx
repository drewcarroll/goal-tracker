"use client";

import { useState, useTransition } from "react";
import type { GoalDTO } from "@/application/dtos/GoalDTO";
import {
  createGoalAction,
  updateGoalAction,
  deleteGoalAction,
  type GoalFormValues,
} from "@/interfaces/web/app/(app)/goals/actions";
import { GoalForm } from "./GoalForm";

type View = { kind: "list" } | { kind: "create" } | { kind: "edit"; goalId: string };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Renders a number without noise: integers as-is, otherwise up to 2 decimals. */
function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function formatWeeks(weeks: number): string {
  return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}

export function GoalsManager({ initialGoals }: { initialGoals: GoalDTO[] }) {
  const [goals, setGoals] = useState<GoalDTO[]>(initialGoals);
  const [view, setView] = useState<View>({ kind: "list" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDelete, startDelete] = useTransition();

  const busy = view.kind !== "list" || confirmDeleteId !== null;

  function handleCreated(goal: GoalDTO) {
    setGoals((prev) => [goal, ...prev]);
    setView({ kind: "list" });
  }

  function handleUpdated(updated: GoalDTO) {
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    setView({ kind: "list" });
  }

  function openDeleteConfirm(goalId: string) {
    setDeleteError(null);
    setConfirmDeleteId(goalId);
  }

  function cancelDelete() {
    setConfirmDeleteId(null);
    setDeleteError(null);
  }

  function confirmDelete(goalId: string) {
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteGoalAction(goalId);
      if (result.ok) {
        setGoals((prev) => prev.filter((g) => g.id !== goalId));
        setConfirmDeleteId(null);
      } else {
        setDeleteError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
        {view.kind === "list" && confirmDeleteId === null && (
          <button
            type="button"
            onClick={() => setView({ kind: "create" })}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
          >
            New goal
          </button>
        )}
      </div>

      {view.kind === "create" && (
        <GoalForm
          onSubmit={(values: GoalFormValues) => createGoalAction(values)}
          onSuccess={handleCreated}
          onCancel={() => setView({ kind: "list" })}
        />
      )}

      {goals.length === 0 && view.kind === "list" ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
          No goals yet. Tap <span className="font-medium text-gray-700">New goal</span> to add your
          first one.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {goals.map((goal) => {
            if (view.kind === "edit" && view.goalId === goal.id) {
              return (
                <li key={goal.id}>
                  <GoalForm
                    goal={goal}
                    onSubmit={(values: GoalFormValues) => updateGoalAction(goal.id, values)}
                    onSuccess={handleUpdated}
                    onCancel={() => setView({ kind: "list" })}
                  />
                </li>
              );
            }

            const isConfirming = confirmDeleteId === goal.id;

            return (
              <li
                key={goal.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">{goal.name}</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-700">
                      {formatNumber(goal.weeklyTarget)} {goal.unit} / week
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {formatDate(goal.startDate)} – {formatDate(goal.endDate)} ·{" "}
                      {formatWeeks(goal.totalWeeks)} · {formatNumber(goal.targetValue)} {goal.unit}{" "}
                      total
                    </p>
                  </div>

                  {!isConfirming && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => setView({ kind: "edit", goalId: goal.id })}
                        disabled={busy}
                        className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(goal.id)}
                        disabled={busy}
                        className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                      Projected by session end
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Past progress plus on-target weeks ahead
                    </p>
                  </div>
                  <p className="shrink-0 text-lg font-bold text-gray-900">
                    {formatNumber(goal.projectedTotal)} {goal.unit}
                  </p>
                </div>

                {isConfirming && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-800">
                      Delete <span className="font-semibold">{goal.name}</span>? This also removes its
                      session and logs and can&apos;t be undone.
                    </p>
                    {deleteError && (
                      <p role="alert" className="mt-2 text-sm font-medium text-red-700">
                        {deleteError}
                      </p>
                    )}
                    <div className="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={cancelDelete}
                        disabled={pendingDelete}
                        className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDelete(goal.id)}
                        disabled={pendingDelete}
                        className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60"
                      >
                        {pendingDelete ? "Deleting…" : "Delete goal"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
