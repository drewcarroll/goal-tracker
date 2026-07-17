import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { ShopOffer } from "@/interfaces/web/components/shop/ShopOffer";
import { CoinIcon } from "@/interfaces/web/components/icons";

export const metadata: Metadata = { title: "Shop · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const { getShopOfferUseCase, localDateService } = getContainer();
  const userId = currentUserId();
  const timezone = currentTimezone();
  const today = localDateService.today(timezone);

  const shopOffer = await getShopOfferUseCase.execute({ userId, date: today });

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">Shop</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
          <CoinIcon className="h-4 w-4" />
          {shopOffer.coinBalance.toLocaleString()}
        </span>
      </div>
      <p className="-mt-2 text-sm text-gray-500">Today&apos;s 5 trinkets. A fresh set tomorrow.</p>

      <ShopOffer offer={shopOffer} />
    </section>
  );
}
