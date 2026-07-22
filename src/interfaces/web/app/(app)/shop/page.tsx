import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { BattlePassTrack } from "@/interfaces/web/components/shop/BattlePassTrack";
import { MysteryBoxCard } from "@/interfaces/web/components/shop/MysteryBoxCard";
import { TrinketCollection } from "@/interfaces/web/components/shop/TrinketCollection";
import { CoinIcon } from "@/interfaces/web/components/icons";

export const metadata: Metadata = { title: "Shop · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

/**
 * The trinkets hub: battle-pass track, mystery-box shop, and collection all
 * in one tab (consolidated 2026-07-18). The shop itself moved from a daily
 * 5-slot rotation to a mystery-box purchase (2026-07-21) — see
 * `OpenMysteryBoxUseCase`.
 */
export default async function ShopPage() {
  const {
    getCoinBalanceUseCase,
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

  const [coinBalance, battlePassCalendar, collection, pinnedIds, economyConfig] = await Promise.all([
    getCoinBalanceUseCase.execute({ userId }),
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
          <CoinIcon className="h-4 w-4 text-amber-500" />
          {coinBalance.toLocaleString()}
        </span>
      </div>

      <BattlePassTrack calendar={battlePassCalendar} todayDate={today} />
      <MysteryBoxCard price={economyConfig.config.mysteryBoxPrice} initialBalance={coinBalance} />
      <TrinketCollection
        collection={collection}
        initialPinnedIds={pinnedIds}
        maxPinned={economyConfig.config.maxPinnedTrinkets}
      />
    </section>
  );
}
