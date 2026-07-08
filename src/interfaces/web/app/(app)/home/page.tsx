import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { TodayGoals } from "@/interfaces/web/components/home/TodayGoals";

export const metadata: Metadata = { title: "Home · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { getActiveGoalsUseCase, getTodayPlanUseCase, localDateService } = getContainer();
  const userId = currentUserId();
  const today = localDateService.today(currentTimezone());

  const [goals, todayPlan] = await Promise.all([
    getActiveGoalsUseCase.execute({ userId }),
    getTodayPlanUseCase.execute({ userId, date: today }),
  ]);

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Home</h1>
        <p className="mt-1 text-gray-600">What you&apos;re working on today.</p>
      </div>
      <TodayGoals goals={goals} todayPlan={todayPlan} />
    </section>
  );
}
