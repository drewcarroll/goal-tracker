import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { PlanningScreen } from "@/interfaces/web/components/plan/PlanningScreen";

export const metadata: Metadata = { title: "Plan · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Planning always targets tomorrow, EXCEPT the grace path: if today ended up
 * with no plan at all, `?for=today` lets the user plan (what's left of)
 * today instead of dead-ending. The target day is still computed
 * server-side from `for` + the user's timezone — the client never supplies
 * a literal date.
 */
export default async function PlanPage({
  searchParams,
}: {
  searchParams: { for?: string };
}) {
  const forToday = searchParams.for === "today";
  const { getActiveHabitsUseCase, getTodayPlanUseCase, localDateService } = getContainer();
  const userId = currentUserId();
  const timezone = currentTimezone();
  const date = forToday ? localDateService.today(timezone) : localDateService.tomorrow(timezone);

  const [habits, existingPlan] = await Promise.all([
    getActiveHabitsUseCase.execute({ userId }),
    getTodayPlanUseCase.execute({ userId, date }),
  ]);

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {forToday ? "Plan today" : "Plan tomorrow"}
        </h1>
        <p className="mt-1 text-gray-600">
          Pick what you&apos;ll attempt, within your 100-lock budget.
        </p>
      </div>
      <PlanningScreen
        habits={habits}
        date={date}
        dateChoice={forToday ? "today" : "tomorrow"}
        existingPlan={existingPlan}
      />
    </section>
  );
}
