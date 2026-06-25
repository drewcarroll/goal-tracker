"use client";

import { useState } from "react";
import type { GoalDTO } from "@/application/dtos/GoalDTO";
import { QuickLogForm } from "./QuickLogForm";
import { CurrentWeekStatus } from "./CurrentWeekStatus";

/**
 * Owns the goal list client-side so logging gives instant feedback: the
 * quick-log action returns the freshly re-projected goal, which we swap in so
 * the "this week" summary updates the moment a log succeeds — no round trip.
 */
export function HomeView({ goals: initialGoals }: { goals: GoalDTO[] }) {
  const [goals, setGoals] = useState<GoalDTO[]>(initialGoals);

  function handleLogged(updated: GoalDTO) {
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  }

  return (
    <>
      <QuickLogForm goals={goals} onLogged={handleLogged} />
      <CurrentWeekStatus goals={goals} />
    </>
  );
}
