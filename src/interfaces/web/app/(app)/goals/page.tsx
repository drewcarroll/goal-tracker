import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { GoalsManager } from "@/interfaces/web/components/goals/GoalsManager";

export const metadata: Metadata = { title: "Goals · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Just the list — tap a goal for its graph, stats, and edit/pause/delete on
 * /goals/[id] (simplified 2026-07-18, user feedback: "goals should just be
 * listed"). Also surfaces a schedule-tomorrow prompt if tomorrow isn't
 * planned yet (user feedback: no path to scheduling from this page).
 */
export default async function GoalsPage() {
  const { getAllGoalsUseCase, getGoalSuggestionsUseCase, getTodayPlanUseCase, localDateService } =
    getContainer();
  const userId = currentUserId();
  const timezone = currentTimezone();
  const tomorrow = localDateService.tomorrow(timezone);

  const [goals, tomorrowPlan] = await Promise.all([
    getAllGoalsUseCase.execute({ userId }),
    getTodayPlanUseCase.execute({ userId, date: tomorrow }),
  ]);
  const suggestions = getGoalSuggestionsUseCase.execute();

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5">
      <h1 className="font-display text-2xl font-bold tracking-tight">Goals</h1>
      <GoalsManager initialGoals={goals} suggestions={suggestions} tomorrowPlanned={tomorrowPlan !== null} />
    </section>
  );
}
