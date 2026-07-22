"use client";

import { useMemo, useState, useTransition } from "react";
import type { OwnedTrinketDTO, TrinketCollectionDTO } from "@/application/dtos/TrinketCollectionDTO";
import { setPinnedTrinketsAction } from "@/interfaces/web/app/(app)/profile/actions";
import { StarIcon } from "@/interfaces/web/components/icons";
import { RarityTag, RARITY_TEXT, LimitedEditionTag, LimitedEditionName } from "./RarityTag";
import { formatTrinketLevel } from "./trinketLevel";

const RARITY_BORDER: Record<string, string> = {
  common: "border-gray-300",
  rare: "border-sky-400",
  epic: "border-violet-400",
  legendary: "border-amber-400",
};

type TierFilter = "all" | "common" | "rare" | "epic" | "legendary" | "limited";
type SortMode = "rarity" | "level" | "recent";

const RARITY_ORDER: Record<string, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };

const FILTER_CHIPS: { value: TierFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "common", label: "Common" },
  { value: "rare", label: "Rare" },
  { value: "epic", label: "Epic" },
  { value: "legendary", label: "Legendary" },
  { value: "limited", label: "Limited Edition" },
];

/**
 * The user's owned trinkets — redesigned 2026-07-21 (Drew's spec): a
 * headline count instead of a wall of locked slots, tier filter chips, a
 * sort control, and a level badge (real level = quantity, see
 * trinketLevel.ts) instead of a bare "×N owned" line.
 */
export function TrinketCollection({
  collection,
  initialPinnedIds,
  maxPinned,
}: {
  collection: TrinketCollectionDTO;
  initialPinnedIds: readonly string[];
  maxPinned: number;
}) {
  const { trinkets, tierCounts, limitedEditionOwned } = collection;
  const [pinnedIds, setPinnedIds] = useState<string[]>([...initialPinnedIds]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TierFilter>("all");
  const [sort, setSort] = useState<SortMode>("rarity");
  const [, startTransition] = useTransition();

  const totalOwned = Object.values(tierCounts).reduce((sum, t) => sum + t.owned, 0);
  const totalCatalog = Object.values(tierCounts).reduce((sum, t) => sum + t.total, 0);

  const visible = useMemo(() => {
    let list = trinkets;
    if (filter === "limited") {
      list = list.filter((t) => !t.rarity);
    } else if (filter !== "all") {
      list = list.filter((t) => t.rarity === filter);
    }
    return [...list].sort((a, b) => {
      if (sort === "level") return b.quantity - a.quantity || a.name.localeCompare(b.name);
      if (sort === "recent") return b.updatedAt.localeCompare(a.updatedAt);
      // rarity: limited edition (no rarity) floats to the end, tiers legendary→common
      const rankA = a.rarity ? RARITY_ORDER[a.rarity]! : 4;
      const rankB = b.rarity ? RARITY_ORDER[b.rarity]! : 4;
      return rankA - rankB || a.name.localeCompare(b.name);
    });
  }, [trinkets, filter, sort]);

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
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-gray-900">Collection</h2>
        <span className="text-xs font-medium text-gray-500">
          {pinnedIds.length}/{maxPinned} displayed
        </span>
      </div>

      <p className="text-sm font-semibold text-gray-700">
        {totalOwned}/{totalCatalog} collected
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {(["legendary", "epic", "rare", "common"] as const).map((rarity) => (
          <span
            key={rarity}
            className={`rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-bold capitalize ${RARITY_TEXT[rarity]}`}
          >
            {rarity} {tierCounts[rarity].owned}/{tierCounts[rarity].total}
          </span>
        ))}
        {limitedEditionOwned > 0 && (
          <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-bold">
            <LimitedEditionName>Limited Edition {limitedEditionOwned}</LimitedEditionName>
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {trinkets.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No items yet.</p>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setFilter(chip.value)}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    filter === chip.value
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 outline-none focus:border-brand"
            >
              <option value="rarity">Sort: Rarity</option>
              <option value="level">Sort: Level</option>
              <option value="recent">Sort: Recently obtained</option>
            </select>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {visible.map((trinket) => (
              <TrinketCard
                key={trinket.id}
                trinket={trinket}
                pinned={pinnedIds.includes(trinket.id)}
                onToggle={() => toggle(trinket.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TrinketCard({
  trinket,
  pinned,
  onToggle,
}: {
  trinket: OwnedTrinketDTO;
  pinned: boolean;
  onToggle: () => void;
}) {
  const borderClass = trinket.rarity ? RARITY_BORDER[trinket.rarity] : "border-fuchsia-300";
  return (
    <button
      type="button"
      onClick={onToggle}
      title={pinned ? `${trinket.name} (displayed, tap to hide)` : trinket.name}
      className={`relative flex flex-col items-center gap-1 rounded-xl border-2 bg-white p-2 transition-transform active:scale-95 ${borderClass}`}
    >
      {pinned && <StarIcon className="absolute -top-2 -left-2 h-5 w-5 text-amber-400 drop-shadow" />}
      <span className="absolute -bottom-1 -right-1 rounded-full bg-gray-900 px-1 text-[9px] font-bold text-white">
        {formatTrinketLevel(trinket.quantity)}
      </span>
      <span className="text-2xl leading-none">{trinket.emoji}</span>
      <span
        className={`w-full truncate text-center text-[10px] font-semibold ${
          trinket.rarity ? RARITY_TEXT[trinket.rarity] : ""
        }`}
      >
        {trinket.rarity ? trinket.name : <LimitedEditionName>{trinket.name}</LimitedEditionName>}
      </span>
      {trinket.rarity ? <RarityTag rarity={trinket.rarity} /> : <LimitedEditionTag />}
    </button>
  );
}
