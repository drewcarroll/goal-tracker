"use client";

import { useState } from "react";
import type { GoalDTO } from "@/application/dtos/GoalDTO";
import type { HabitDTO } from "@/application/dtos/HabitDTO";
import type { DailyPlanDTO } from "@/application/dtos/DailyPlanDTO";
import { QuickLogForm } from "./QuickLogForm";
import { CurrentWeekStatus } from "./CurrentWeekStatus";
import { TodayHabits } from "./TodayHabits";

/**
 * Owns the goal list client-side so logging gives instant feedback: the
 * quick-log action returns the freshly re-projected goal, which we swap in so
 * the "this week" summary updates the moment a log succeeds — no round trip.
 * Habits are read-only here (check-in flow arrives in Phase 3), so they stay
 * server-fetched props with no local state.
 */
export function HomeView({
  goals: initialGoals,
  habits,
  todayPlan,
}: {
  goals: GoalDTO[];
  habits: HabitDTO[];
  todayPlan: DailyPlanDTO | null;
}) {
  const [goals, setGoals] = useState<GoalDTO[]>(initialGoals);

  function handleLogged(updated: GoalDTO) {
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  }

  return (
    <>
      <TodayHabits habits={habits} todayPlan={todayPlan} />
      <QuickLogForm goals={goals} onLogged={handleLogged} />
      <CurrentWeekStatus goals={goals} />
    </>
  );
}
