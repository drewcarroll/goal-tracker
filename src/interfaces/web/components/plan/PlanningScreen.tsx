"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GoalDTO } from "@/application/dtos/GoalDTO";
import { DAILY_LOCK_BUDGET, type DailyPlanDTO } from "@/application/dtos/DailyPlanDTO";
import type { WeeklyGoalStatusDTO } from "@/application/use-cases/GetWeeklyScheduleStatusUseCase";
import { createDailyPlanAction } from "@/interfaces/web/app/(app)/plan/actions";

/** "YYYY-MM-DD" -> "Tuesday, July 7". Parsed as UTC to avoid a local-timezone shift. */
function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function PlanningScreen({
  goals,
  date,
  dateChoice,
  existingPlan,
  weeklyStatus,
}: {
  goals: GoalDTO[];
  date: string;
  dateChoice: "today" | "tomorrow";
  existingPlan: DailyPlanDTO | null;
  weeklyStatus: WeeklyGoalStatusDTO[];
}) {
  if (existingPlan) {
    return <AlreadyPlanned goals={goals} date={date} plan={existingPlan} />;
  }
  return <GoalPicker goals={goals} date={date} dateChoice={dateChoice} weeklyStatus={weeklyStatus} />;
}

function AlreadyPlanned({
  goals,
  date,
  plan,
}: {
  goals: GoalDTO[];
  date: string;
  plan: DailyPlanDTO;
}) {
  const scheduledIds = new Set(plan.goalIds);
  const notScheduled = goals.filter((g) => !scheduledIds.has(g.id));

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-900/[0.06] bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-sm font-medium text-brand">{formatDate(date)}</p>
        <p className="mt-1 text-base text-gray-700">Already scheduled: {plan.locksSpent} keys.</p>
      </div>
      <ul className="flex flex-col gap-2">
        {plan.goalIds.map((goalId) => {
          const goal = goals.find((g) => g.id === goalId);
          return (
            <li
              key={goalId}
              className="flex items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-2.5 text-sm"
            >
              <span className="min-w-0 truncate font-medium text-gray-900">
                {goal?.name ?? "Goal"}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {goal && <span className="text-gray-500">{goal.currentLockCost} keys</span>}
                <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand">
                  Scheduled
                </span>
              </span>
            </li>
          );
        })}
        {notScheduled.map((goal) => (
          <li
            key={goal.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm"
          >
            <span className="min-w-0 truncate font-medium text-gray-500">{goal.name}</span>
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-500">
              Not scheduled
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GoalPicker({
  goals,
  date,
  dateChoice,
  weeklyStatus,
}: {
  goals: GoalDTO[];
  date: string;
  dateChoice: "today" | "tomorrow";
  weeklyStatus: WeeklyGoalStatusDTO[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const statusByGoal = new Map(weeklyStatus.map((s) => [s.goalId, s]));
  const byId = new Map(goals.map((g) => [g.id, g]));
  const selectedKeys = Array.from(selected).reduce(
    (sum, goalId) => sum + (byId.get(goalId)?.currentLockCost ?? 0),
    0,
  );
  const overBudget = selectedKeys > DAILY_LOCK_BUDGET;

  function toggle(goalId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createDailyPlanAction(Array.from(selected), dateChoice);
      if (result.ok) {
        router.push("/home");
      } else {
        setError(result.error);
      }
    });
  }

  if (goals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="text-gray-600">No goals to plan yet.</p>
        <a
          href="/goals"
          className="mt-4 inline-block rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          Set up goals
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-brand">{formatDate(date)}</p>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {goals.map((goal) => {
          const checked = selected.has(goal.id);
          const status = statusByGoal.get(goal.id);
          const behindTarget = status && !status.onTrack && !checked;
          return (
            <div key={goal.id} className="flex flex-col gap-1">
              <label
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  checked ? "border-brand bg-brand/5" : "border-gray-300 bg-white hover:bg-gray-50"
                }`}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-base font-medium text-gray-900">{goal.name}</span>
                  <span className="text-xs text-gray-500">
                    {goal.currentLockCost} keys
                    {goal.state === "formed" ? " · formed" : ""}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      checked ? "bg-brand/15 text-brand" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {checked ? "Scheduled" : "Not scheduled"}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(goal.id)}
                    className="h-5 w-5 shrink-0 accent-brand"
                  />
                </span>
              </label>
              {behindTarget && (
                <span className="px-1 text-xs text-amber-600">
                  Won&apos;t hit its {status.weeklyFrequencyTarget}×/week target unless scheduled soon.
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div
        className={`sticky bottom-3 flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm ${
          overBudget
            ? "border-red-300 bg-red-50 text-red-700"
            : "border-gray-900/[0.06] bg-white text-gray-700"
        }`}
      >
        <span>Keys for {dateChoice}</span>
        <span>
          {selectedKeys} / {DAILY_LOCK_BUDGET}
        </span>
      </div>
      {overBudget && (
        <p role="alert" className="-mt-2 text-xs text-red-600">
          Over the daily key budget. Unschedule something to make room.
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending || selected.size === 0 || overBudget}
        className="mt-1 rounded-xl bg-brand px-5 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : `Schedule ${dateChoice} (${selected.size})`}
      </button>
    </div>
  );
}
