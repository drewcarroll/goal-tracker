import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { BattlePassMonthCalendar } from "@/interfaces/web/components/trinkets/BattlePassMonthCalendar";

export const metadata: Metadata = { title: "Rewards · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

/**
 * The battle-pass month calendar. Not a nav tab (folded out 2026-07-18) —
 * reached via Home's "View rewards" link and Profile.
 */
export default async function TrinketsPage() {
  const { getBattlePassCalendarUseCase, localDateService } = getContainer();
  const userId = currentUserId();
  const timezone = currentTimezone();
  const today = localDateService.today(timezone);
  const [year, month] = today.split("-").map(Number) as [number, number];

  const calendar = await getBattlePassCalendarUseCase.execute({ userId, year, month, todayDate: today });

  // Monday = 0 … Sunday = 6, the weekday the 1st of this month falls on —
  // pure calendar-grid layout math, not a business rule.
  const jsWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const firstWeekdayIndex = (jsWeekday + 6) % 7;

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5">
      <h1 className="font-display text-2xl font-bold tracking-tight">Rewards</h1>
      <BattlePassMonthCalendar calendar={calendar} firstWeekdayIndex={firstWeekdayIndex} />
    </section>
  );
}
