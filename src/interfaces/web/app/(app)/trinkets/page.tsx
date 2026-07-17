import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { BattlePassMonthCalendar } from "@/interfaces/web/components/trinkets/BattlePassMonthCalendar";
import { ShopOffer } from "@/interfaces/web/components/trinkets/ShopOffer";
import { TrinketCollection } from "@/interfaces/web/components/trinkets/TrinketCollection";
import { ActivityFeed } from "@/interfaces/web/components/trinkets/ActivityFeed";
import { CoinIcon } from "@/interfaces/web/components/icons";

export const metadata: Metadata = { title: "Trinkets · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Trinkets: one tab internally segmented Battle Pass | Shop | Collection |
 * Feed, per the design doc ("NOT four more top-level tabs").
 */
export default async function TrinketsPage() {
  const {
    getBattlePassCalendarUseCase,
    getShopOfferUseCase,
    getTrinketCollectionUseCase,
    getActivityFeedUseCase,
    localDateService,
  } = getContainer();
  const userId = currentUserId();
  const timezone = currentTimezone();
  const today = localDateService.today(timezone);
  const [year, month] = today.split("-").map(Number) as [number, number];

  const [calendar, shopOffer, collection, feed] = await Promise.all([
    getBattlePassCalendarUseCase.execute({ userId, year, month, todayDate: today }),
    getShopOfferUseCase.execute({ userId, date: today }),
    getTrinketCollectionUseCase.execute({ userId }),
    getActivityFeedUseCase.execute({ userId }),
  ]);

  // Monday = 0 … Sunday = 6, the weekday the 1st of this month falls on —
  // pure calendar-grid layout math, not a business rule.
  const jsWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const firstWeekdayIndex = (jsWeekday + 6) % 7;

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Trinkets</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
          <CoinIcon className="h-4 w-4" />
          {shopOffer.coinBalance.toLocaleString()}
        </span>
      </div>

      <BattlePassMonthCalendar calendar={calendar} firstWeekdayIndex={firstWeekdayIndex} />
      <ShopOffer offer={shopOffer} />
      <TrinketCollection trinkets={collection} />
      <ActivityFeed items={feed} />
    </section>
  );
}
