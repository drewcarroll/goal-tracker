import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { PlanningScreen } from "@/interfaces/web/components/plan/PlanningScreen";

export const metadata: Metadata = { title: "Schedule · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Planning always targets tomorrow, EXCEPT the grace path: if today ended up
 * with no plan at all, `?for=today` lets the user plan (what's left of)
 * today instead of dead-ending. The target day is still computed
 * server-side from `for` + the user's timezone — the client never supplies
 * a literal date. Reachable from Home's "Schedule tomorrow" nudge and the
 * today-grace-path link; scheduling itself normally happens inline in the
 * end-of-day flow on Home (see DailyFlow.tsx's TomorrowPicker).
 */
export default async function PlanPage({
  searchParams,
}: {
  searchParams: { for?: string };
}) {
  const forToday = searchParams.for === "today";
  const { getActiveGoalsUseCase, getTodayPlanUseCase, getWeeklyScheduleStatusUseCase, localDateService } =
    getContainer();
  const userId = currentUserId();
  const timezone = currentTimezone();
  const today = localDateService.today(timezone);
  const date = forToday ? today : localDateService.tomorrow(timezone);

  const [goals, existingPlan, weeklyStatus] = await Promise.all([
    getActiveGoalsUseCase.execute({ userId }),
    getTodayPlanUseCase.execute({ userId, date }),
    getWeeklyScheduleStatusUseCase.execute({ userId, todayDate: today }),
  ]);

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {forToday ? "Schedule today" : "Schedule tomorrow"}
        </h1>
        <p className="mt-1 text-gray-600">Pick what you&apos;ll attempt.</p>
      </div>
      <PlanningScreen
        goals={goals}
        date={date}
        dateChoice={forToday ? "today" : "tomorrow"}
        existingPlan={existingPlan}
        weeklyStatus={weeklyStatus}
      />
    </section>
  );
}
