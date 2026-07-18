import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { BattlePassTrack } from "@/interfaces/web/components/shop/BattlePassTrack";
import { ShopOffer } from "@/interfaces/web/components/shop/ShopOffer";
import { TrinketCollection } from "@/interfaces/web/components/shop/TrinketCollection";
import { CoinIcon } from "@/interfaces/web/components/icons";

export const metadata: Metadata = { title: "Shop · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

/**
 * The trinkets hub: battle-pass track, daily shop, and collection all in
 * one tab (consolidated 2026-07-18, user feedback — Collection and the
 * rewards calendar both moved here from Profile, which now only keeps
 * Feed).
 */
export default async function ShopPage() {
  const {
    getShopOfferUseCase,
    getBattlePassCalendarUseCase,
    getTrinketCollectionUseCase,
    getPinnedTrinketsUseCase,
    getEconomyConfigUseCase,
    localDateService,
  } = getContainer();
  const userId = currentUserId();
  const timezone = currentTimezone();
  const today = localDateService.today(timezone);
  const [year, month] = today.split("-").map(Number) as [number, number];

  const [shopOffer, battlePassCalendar, trinkets, pinnedIds, economyConfig] = await Promise.all([
    getShopOfferUseCase.execute({ userId, date: today }),
    getBattlePassCalendarUseCase.execute({ userId, year, month, todayDate: today }),
    getTrinketCollectionUseCase.execute({ userId }),
    getPinnedTrinketsUseCase.execute({ userId }),
    getEconomyConfigUseCase.execute(),
  ]);

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">Shop</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
          <CoinIcon className="h-4 w-4" />
          {shopOffer.coinBalance.toLocaleString()}
        </span>
      </div>

      <BattlePassTrack calendar={battlePassCalendar} />
      <ShopOffer offer={shopOffer} />
      <TrinketCollection
        trinkets={trinkets}
        initialPinnedIds={pinnedIds}
        maxPinned={economyConfig.config.maxPinnedTrinkets}
      />
    </section>
  );
}
