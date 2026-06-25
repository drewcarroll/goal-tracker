"use client";

import { useState } from "react";
import type { GoalDTO } from "@/application/dtos/GoalDTO";
import {
  createGoalAction,
  updateGoalAction,
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

/** Renders the numeric target without trailing zeros (12, not 12.0000). */
function formatTarget(value: number): string {
  return String(value);
}

export function GoalsManager({ initialGoals }: { initialGoals: GoalDTO[] }) {
  const [goals, setGoals] = useState<GoalDTO[]>(initialGoals);
  const [view, setView] = useState<View>({ kind: "list" });

  function handleCreated(goal: GoalDTO) {
    setGoals((prev) => [goal, ...prev]);
    setView({ kind: "list" });
  }

  function handleUpdated(updated: GoalDTO) {
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    setView({ kind: "list" });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
        {view.kind === "list" && (
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
          {goals.map((goal) =>
            view.kind === "edit" && view.goalId === goal.id ? (
              <li key={goal.id}>
                <GoalForm
                  goal={goal}
                  onSubmit={(values: GoalFormValues) => updateGoalAction(goal.id, values)}
                  onSuccess={handleUpdated}
                  onCancel={() => setView({ kind: "list" })}
                />
              </li>
            ) : (
              <li
                key={goal.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{goal.name}</p>
                  <p className="mt-0.5 text-sm text-gray-600">
                    {formatTarget(goal.targetValue)} {goal.unit}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {formatDate(goal.startDate)} – {formatDate(goal.endDate)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setView({ kind: "edit", goalId: goal.id })}
                  disabled={view.kind !== "list"}
                  className="shrink-0 rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
                >
                  Edit
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
