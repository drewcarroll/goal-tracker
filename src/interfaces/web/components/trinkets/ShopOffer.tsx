"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ShopOfferDTO } from "@/application/dtos/ShopDTO";
import { purchaseShopSlotAction } from "@/interfaces/web/app/(app)/trinkets/actions";

const RARITY_STYLES: Record<string, string> = {
  common: "border-gray-300 bg-gray-50",
  rare: "border-sky-300 bg-sky-50",
  epic: "border-violet-300 bg-violet-50",
  legendary: "border-amber-300 bg-amber-50",
};

/**
 * Today's 5-slot rotating shop offer. Every trinket is flatly priced (user
 * decision, 2026-07-16) — rarity only changes the border color here, not the
 * price. Buying a duplicate is expected: owned quantity shows as a "×N"
 * badge rather than the slot becoming uneditable once owned once.
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
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Shop</h2>

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

      <div className="grid grid-cols-5 gap-2">
        {offer.slots.map((slot) => {
          const affordable = offer.coinBalance >= slot.price;
          const disabled = slot.purchased || !affordable || pendingSlot !== null;
          return (
            <div key={slot.slotIndex} className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 text-2xl ${RARITY_STYLES[slot.trinket.rarity]}`}
                title={slot.trinket.name}
              >
                {slot.trinket.emoji}
              </div>
              <span className="h-3 text-[10px] font-semibold text-gray-400">
                {slot.ownedQuantity > 0 ? `×${slot.ownedQuantity}` : ""}
              </span>
              <button
                type="button"
                onClick={() => buy(slot.slotIndex)}
                disabled={disabled}
                className={`w-full rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  slot.purchased
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-brand text-white hover:bg-brand-dark disabled:opacity-50"
                }`}
              >
                {pendingSlot === slot.slotIndex ? "…" : slot.purchased ? "Owned" : slot.price}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
