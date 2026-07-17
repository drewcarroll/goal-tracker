import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { TodayGoals } from "@/interfaces/web/components/home/TodayGoals";
import { BattlePassStrip } from "@/interfaces/web/components/trinkets/BattlePassStrip";

export const metadata: Metadata = { title: "Home · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const {
    getActiveGoalsUseCase,
    getTodayPlanUseCase,
    getCheckInWindowUseCase,
    getTodayCheckInUseCase,
    getBattlePassCalendarUseCase,
    localDateService,
  } = getContainer();
  const userId = currentUserId();
  const timezone = currentTimezone();

  // "Today" is the check-in window's logical day when it's open (at 1 AM
  // you're still living yesterday's plan, same as /checkin); otherwise the
  // plain calendar day.
  const window = await getCheckInWindowUseCase.execute({ userId, timezone });
  const today = window.open ? window.targetDate : localDateService.today(timezone);
  const [year, month] = today.split("-").map(Number) as [number, number];

  const [goals, todayPlan, todayCheckIn, battlePassCalendar] = await Promise.all([
    getActiveGoalsUseCase.execute({ userId }),
    getTodayPlanUseCase.execute({ userId, date: today }),
    getTodayCheckInUseCase.execute({ userId, date: today }),
    getBattlePassCalendarUseCase.execute({ userId, year, month, todayDate: today }),
  ]);

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Home</h1>
        <p className="mt-1 text-gray-600">What you&apos;re working on today.</p>
      </div>
      <BattlePassStrip calendar={battlePassCalendar} />
      <TodayGoals goals={goals} todayPlan={todayPlan} checkedIn={todayCheckIn !== null} />
    </section>
  );
}
