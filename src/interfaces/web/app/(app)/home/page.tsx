import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { DailyFlow, type RewardPreview } from "@/interfaces/web/components/home/DailyFlow";

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
    getWeeklyScheduleStatusUseCase,
    localDateService,
  } = getContainer();
  const userId = currentUserId();
  const timezone = currentTimezone();

  // "Today" is the check-in window's logical day when it's open (at 1 AM
  // you're still living yesterday's plan, same as the nightly log); otherwise
  // the plain calendar day.
  const window = await getCheckInWindowUseCase.execute({ userId, timezone });
  const today = window.open ? window.targetDate : localDateService.today(timezone);
  const tomorrow = localDateService.tomorrow(timezone);
  const [year, month] = today.split("-").map(Number) as [number, number];
  const todayDay = Number(today.split("-")[2]);

  const [goals, todayPlan, todayCheckIn, battlePassCalendar, tomorrowPlan, weeklyStatus] =
    await Promise.all([
      getActiveGoalsUseCase.execute({ userId }),
      getTodayPlanUseCase.execute({ userId, date: today }),
      getTodayCheckInUseCase.execute({ userId, date: today }),
      getBattlePassCalendarUseCase.execute({ userId, year, month, todayDate: today }),
      getTodayPlanUseCase.execute({ userId, date: tomorrow }),
      getWeeklyScheduleStatusUseCase.execute({ userId, todayDate: today }),
    ]);

  const byId = new Map(goals.map((g) => [g.id, g]));
  const plannedGoals = (todayPlan?.goalIds ?? [])
    .map((id) => byId.get(id))
    .filter((g): g is NonNullable<typeof g> => g !== undefined);

  const todayCell = battlePassCalendar.cells.find((cell) => cell.day === todayDay);
  const todayRewardPreview: RewardPreview | null =
    todayCell && !todayCell.claimed
      ? todayCell.kind === "coins"
        ? { kind: "coins", coinAmount: todayCell.coinAmount! }
        : { kind: "trinket", trinketEmoji: todayCell.trinketEmoji!, trinketName: todayCell.trinketName! }
      : null;

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Today&apos;s Goals</h1>
      </div>
      <DailyFlow
        goals={goals}
        plannedGoals={plannedGoals}
        hasTodayPlan={todayPlan !== null}
        existingCheckIn={todayCheckIn}
        windowOpen={window.open}
        opensAtRaw={window.open ? null : window.opensAt}
        todayRewardPreview={todayRewardPreview}
        tomorrowPlan={tomorrowPlan}
        weeklyStatus={weeklyStatus}
      />
    </section>
  );
}
