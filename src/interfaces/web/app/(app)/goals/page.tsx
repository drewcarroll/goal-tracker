import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { WEEKLY_LOCK_CAPACITY } from "@/application/dtos/GoalDTO";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { GoalsManager } from "@/interfaces/web/components/goals/GoalsManager";

export const metadata: Metadata = { title: "Goals · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

/** "2026-07-13" → "Jul 13" (UTC-parsed to avoid a local-timezone shift). */
function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * The weekly portfolio: every active goal claims its lock cost against the
 * shared weekly capacity. Costs move with your results, so this page is
 * where the week's real decision happens: keep everything, or pause / lighten
 * something to fit.
 */
export default async function GoalsPage() {
  const { getAllGoalsUseCase, getGoalSuggestionsUseCase, localDateService } = getContainer();
  const userId = currentUserId();
  const goals = await getAllGoalsUseCase.execute({ userId });
  const suggestions = getGoalSuggestionsUseCase.execute();
  const week = localDateService.weekOf(currentTimezone());

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Weekly goals</h1>
        <p className="mt-1 text-sm text-gray-500">
          {formatDay(week.start)} – {formatDay(week.end)}
        </p>
      </div>
      <GoalsManager
        initialGoals={goals}
        suggestions={suggestions}
        capacity={WEEKLY_LOCK_CAPACITY}
      />
    </section>
  );
}
