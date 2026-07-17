import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { WEEKLY_LOCK_CAPACITY } from "@/application/dtos/GoalDTO";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { GoalsManager } from "@/interfaces/web/components/goals/GoalsManager";

export const metadata: Metadata = { title: "Goals · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Every goal, its own trending-strength graph (agnostic of any single
 * week — see the goal detail page and docs/plan.md Phase 10), and the
 * shared weekly key capacity every active goal claims against.
 */
export default async function GoalsPage() {
  const { getAllGoalsUseCase, getGoalSuggestionsUseCase, getGoalStatsUseCase, localDateService } =
    getContainer();
  const userId = currentUserId();
  const timezone = currentTimezone();
  const today = localDateService.today(timezone);
  const goals = await getAllGoalsUseCase.execute({ userId });
  const suggestions = getGoalSuggestionsUseCase.execute();

  const stats = await Promise.all(
    goals.map((goal) => getGoalStatsUseCase.execute({ userId, goalId: goal.id, today })),
  );
  const statsByGoalId = Object.fromEntries(stats.map((s) => [s.goalId, s]));

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
        <p className="mt-1 text-sm text-gray-500">
          How each one is trending, agnostic of any single week.
        </p>
      </div>
      <GoalsManager
        initialGoals={goals}
        suggestions={suggestions}
        capacity={WEEKLY_LOCK_CAPACITY}
        statsByGoalId={statsByGoalId}
        today={today}
      />
    </section>
  );
}
