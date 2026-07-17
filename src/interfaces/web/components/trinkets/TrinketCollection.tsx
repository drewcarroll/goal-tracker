"use client";

import { useState, useTransition } from "react";
import type { OwnedTrinketDTO } from "@/application/dtos/TrinketCollectionDTO";
import { setPinnedTrinketsAction } from "@/interfaces/web/app/(app)/profile/actions";

/**
 * The user's owned trinkets — not collect-once, so duplicates show a "×N"
 * badge. Tapping one pins/unpins it for display (star badge), up to
 * `maxPinned`.
 */
export function TrinketCollection({
  trinkets,
  initialPinnedIds,
  maxPinned,
}: {
  trinkets: OwnedTrinketDTO[];
  initialPinnedIds: readonly string[];
  maxPinned: number;
}) {
  const [pinnedIds, setPinnedIds] = useState<string[]>([...initialPinnedIds]);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(trinketId: string) {
    setError(null);
    const isPinned = pinnedIds.includes(trinketId);
    if (!isPinned && pinnedIds.length >= maxPinned) {
      setError(`You can only display up to ${maxPinned} trinkets at once.`);
      return;
    }
    const next = isPinned ? pinnedIds.filter((id) => id !== trinketId) : [...pinnedIds, trinketId];
    setPinnedIds(next);
    startTransition(async () => {
      const result = await setPinnedTrinketsAction(next);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-gray-900">Collection</h2>
        <span className="text-xs text-gray-400">
          {pinnedIds.length}/{maxPinned} displayed
        </span>
      </div>
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {trinkets.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nothing collected yet — claim a battle-pass day or buy from the shop.
        </p>
      ) : (
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {trinkets.map((trinket) => {
            const pinned = pinnedIds.includes(trinket.id);
            return (
              <button
                key={trinket.id}
                type="button"
                onClick={() => toggle(trinket.id)}
                title={pinned ? `${trinket.name} (displayed — tap to hide)` : trinket.name}
                className={`relative flex aspect-square items-center justify-center rounded-xl border text-xl transition-colors active:scale-95 ${
                  pinned ? "border-brand bg-brand/10" : "border-gray-200 bg-gray-50"
                }`}
              >
                {trinket.emoji}
                {trinket.quantity > 1 && (
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-gray-900 px-1 text-[9px] font-bold text-white">
                    ×{trinket.quantity}
                  </span>
                )}
                {pinned && (
                  <span className="absolute -top-1 -left-1 text-xs leading-none">⭐</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
