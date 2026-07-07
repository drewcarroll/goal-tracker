"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { HabitDTO } from "@/application/dtos/HabitDTO";
import type { DailyPlanDTO } from "@/application/dtos/DailyPlanDTO";
import { createDailyPlanAction } from "@/interfaces/web/app/(app)/plan/actions";

const LOCK_BUDGET = 100;

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
  habits,
  date,
  dateChoice,
  existingPlan,
}: {
  habits: HabitDTO[];
  date: string;
  dateChoice: "today" | "tomorrow";
  existingPlan: DailyPlanDTO | null;
}) {
  if (existingPlan) {
    return <AlreadyPlanned habits={habits} date={date} plan={existingPlan} />;
  }
  return <HabitPicker habits={habits} date={date} dateChoice={dateChoice} />;
}

function AlreadyPlanned({
  habits,
  date,
  plan,
}: {
  habits: HabitDTO[];
  date: string;
  plan: DailyPlanDTO;
}) {
  const byId = new Map(habits.map((h) => [h.id, h]));
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-sm font-medium text-brand">{formatDate(date)}</p>
        <p className="mt-1 text-base text-gray-700">
          Already planned — {plan.locksSpent} / {LOCK_BUDGET} locks.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {plan.habitIds.map((habitId) => {
          const habit = byId.get(habitId);
          return (
            <li
              key={habitId}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm"
            >
              <span className="font-medium text-gray-900">{habit?.label ?? "Habit"}</span>
              {habit && <span className="text-gray-500">{habit.currentLockCost} locks</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HabitPicker({
  habits,
  date,
  dateChoice,
}: {
  habits: HabitDTO[];
  date: string;
  dateChoice: "today" | "tomorrow";
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const locksSpent = useMemo(
    () =>
      habits
        .filter((h) => selected.has(h.id))
        .reduce((sum, h) => sum + h.currentLockCost, 0),
    [habits, selected],
  );
  const overBudget = locksSpent > LOCK_BUDGET;

  function toggle(habitId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(habitId)) {
        next.delete(habitId);
      } else {
        next.add(habitId);
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

  if (habits.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="text-gray-600">No habits to plan yet.</p>
        <a
          href="/onboarding"
          className="mt-4 inline-block rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          Set up habits
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-brand">{formatDate(date)}</p>

      {/* Live remaining-lock counter — sticky so it's visible while scrolling the list. */}
      <div
        className={`sticky top-2 z-10 rounded-xl border px-4 py-3 shadow-sm ${
          overBudget ? "border-red-300 bg-red-50" : "border-brand/20 bg-brand/5"
        }`}
      >
        <div className="flex items-center justify-between text-sm">
          <span className={overBudget ? "font-semibold text-red-700" : "font-semibold text-brand"}>
            {locksSpent} / {LOCK_BUDGET} locks
          </span>
          {overBudget && <span className="text-xs font-medium text-red-700">Over budget</span>}
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full transition-all ${overBudget ? "bg-red-500" : "bg-brand"}`}
            style={{ width: `${Math.min(100, (locksSpent / LOCK_BUDGET) * 100)}%` }}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {habits.map((habit) => {
          const checked = selected.has(habit.id);
          return (
            <label
              key={habit.id}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
                checked ? "cursor-pointer border-brand bg-brand/5" : "cursor-pointer border-gray-300 bg-white hover:bg-gray-50"
              }`}
            >
              <span className="flex flex-col">
                <span className="text-base font-medium text-gray-900">{habit.label}</span>
                <span className="text-xs text-gray-500">
                  {habit.currentLockCost} locks
                  {habit.state === "formed" ? " · formed" : ""}
                </span>
              </span>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(habit.id)}
                className="h-5 w-5 shrink-0 accent-brand"
              />
            </label>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending || selected.size === 0 || overBudget}
        className="mt-1 rounded-xl bg-brand px-5 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : `Plan tomorrow (${selected.size})`}
      </button>
    </div>
  );
}
