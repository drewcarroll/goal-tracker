"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ShopOfferDTO } from "@/application/dtos/ShopDTO";
import { purchaseShopSlotAction } from "@/interfaces/web/app/(app)/shop/actions";
import { RarityTag } from "./RarityTag";
import { ShopCountdown } from "./ShopCountdown";
import { CoinIcon } from "@/interfaces/web/components/icons";

const RARITY_BORDER: Record<string, string> = {
  common: "border-gray-300",
  rare: "border-sky-400",
  epic: "border-violet-400",
  legendary: "border-amber-400",
};

const RARITY_ICON_BG: Record<string, string> = {
  common: "bg-gray-100",
  rare: "bg-sky-50",
  epic: "bg-violet-50",
  legendary: "bg-amber-50",
};

/**
 * Today's 5-slot rotating shop offer. Every trinket is flatly priced (user
 * decision, 2026-07-16) — rarity affects the border/tag here, never the
 * price. Buying a duplicate is expected: owned quantity shows as a "×N"
 * badge rather than the slot becoming uneditable once owned once. The 5
 * slots are always 5 distinct trinkets (ShopRollService, fixed 2026-07-17
 * after a live duplicate-slot bug); the rarity weights are tuned so roughly
 * half of all offers include a rare, 15% an epic, 5% a legendary
 * (2026-07-18).
 */
export function ShopOffer({ offer }: { offer: ShopOfferDTO }) {
  const router = useRouter();
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function buy(slotIndex: number) {
    setError(null);
    setSuccess(null);
    setPendingSlot(slotIndex);
    startTransition(async () => {
      const result = await purchaseShopSlotAction(slotIndex);
      setPendingSlot(null);
      if (result.ok) {
        setSuccess(`Bought ${result.result.trinket.emoji} ${result.result.trinket.name}.`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-gray-900">Shop</h2>
        <ShopCountdown />
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {offer.slots.map((slot) => {
          const affordable = offer.coinBalance >= slot.price;
          const disabled = slot.purchased || !affordable || pendingSlot !== null;
          return (
            <div
              key={slot.slotIndex}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 ${RARITY_BORDER[slot.trinket.rarity]}`}
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-xl text-2xl ${RARITY_ICON_BG[slot.trinket.rarity]}`}
              >
                {slot.trinket.emoji}
              </div>
              <p className="w-full truncate text-center text-xs font-semibold text-gray-900" title={slot.trinket.name}>
                {slot.trinket.name}
              </p>
              <RarityTag rarity={slot.trinket.rarity} />
              <span className="h-3 text-[10px] font-bold text-gray-500">
                {slot.ownedQuantity > 0 ? `×${slot.ownedQuantity} owned` : ""}
              </span>
              <button
                type="button"
                onClick={() => buy(slot.slotIndex)}
                disabled={disabled}
                className={`inline-flex w-full items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-[11px] font-bold transition-colors ${
                  slot.purchased
                    ? "bg-emerald-100 text-emerald-700"
                    : affordable
                      ? "bg-brand text-white hover:bg-brand-dark"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {pendingSlot === slot.slotIndex ? (
                  "…"
                ) : slot.purchased ? (
                  "Owned"
                ) : (
                  <>
                    <CoinIcon className="h-3 w-3" />
                    {slot.price}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
