import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { ProgressView } from "@/interfaces/web/components/progress/ProgressView";
import type { HabitStatsDTO } from "@/application/dtos/HabitStatsDTO";

export const metadata: Metadata = { title: "Progress · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const {
    getProgressDataUseCase,
    getAllHabitsUseCase,
    getHabitStatsUseCase,
    getCheckInHistoryUseCase,
    localDateService,
  } = getContainer();
  const userId = currentUserId();
  const today = localDateService.today(currentTimezone());

  const [charts, habits, checkIns] = await Promise.all([
    getProgressDataUseCase.execute({ userId }),
    getAllHabitsUseCase.execute({ userId }),
    getCheckInHistoryUseCase.execute({ userId }),
  ]);

  const habitStats: HabitStatsDTO[] = await Promise.all(
    habits.map((habit) => getHabitStatsUseCase.execute({ userId, habitId: habit.id, today })),
  );

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <p className="mt-1 text-gray-600">
          Session completion and your cumulative pace toward each goal.
        </p>
      </div>
      <ProgressView charts={charts} habitStats={habitStats} checkIns={checkIns} today={today} />
    </section>
  );
}
