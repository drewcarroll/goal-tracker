"use client";

import { useState, useTransition } from "react";
import type { OwnedTrinketDTO } from "@/application/dtos/TrinketCollectionDTO";
import { setPinnedTrinketsAction } from "@/interfaces/web/app/(app)/profile/actions";
import { StarIcon } from "@/interfaces/web/components/icons";
import { RarityTag, LimitedEditionTag } from "./RarityTag";

const RARITY_BORDER: Record<string, string> = {
  common: "border-gray-300",
  rare: "border-sky-400",
  epic: "border-violet-400",
  legendary: "border-amber-400",
};

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
        <span className="text-xs font-medium text-gray-500">
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
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {trinkets.map((trinket) => {
            const pinned = pinnedIds.includes(trinket.id);
            const borderClass = trinket.rarity
              ? RARITY_BORDER[trinket.rarity]
              : "border-fuchsia-300";
            return (
              <button
                key={trinket.id}
                type="button"
                onClick={() => toggle(trinket.id)}
                title={pinned ? `${trinket.name} (displayed — tap to hide)` : trinket.name}
                className={`relative flex flex-col items-center gap-1 rounded-xl border-2 bg-white p-2 transition-transform active:scale-95 ${borderClass}`}
              >
                {pinned && (
                  <StarIcon className="absolute -top-2 -left-2 h-5 w-5 text-amber-400 drop-shadow" />
                )}
                {trinket.quantity > 1 && (
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-gray-900 px-1 text-[9px] font-bold text-white">
                    ×{trinket.quantity}
                  </span>
                )}
                <span className="text-2xl leading-none">{trinket.emoji}</span>
                <span className="w-full truncate text-center text-[10px] font-semibold text-gray-900">
                  {trinket.name}
                </span>
                {trinket.rarity ? <RarityTag rarity={trinket.rarity} /> : <LimitedEditionTag />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
