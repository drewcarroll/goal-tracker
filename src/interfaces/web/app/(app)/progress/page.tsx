import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { ProgressView } from "@/interfaces/web/components/progress/ProgressView";
import type { GoalStatsDTO } from "@/application/dtos/GoalStatsDTO";

export const metadata: Metadata = { title: "Progress · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const { getAllGoalsUseCase, getGoalStatsUseCase, getCheckInHistoryUseCase, localDateService } =
    getContainer();
  const userId = currentUserId();
  const today = localDateService.today(currentTimezone());

  const [goals, checkIns] = await Promise.all([
    getAllGoalsUseCase.execute({ userId }),
    getCheckInHistoryUseCase.execute({ userId }),
  ]);

  const goalStats: GoalStatsDTO[] = await Promise.all(
    goals.map((goal) => getGoalStatsUseCase.execute({ userId, goalId: goal.id, today })),
  );

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <p className="mt-1 text-gray-600">How each goal is trending.</p>
      </div>
      <ProgressView goalStats={goalStats} checkIns={checkIns} today={today} />
    </section>
  );
}
