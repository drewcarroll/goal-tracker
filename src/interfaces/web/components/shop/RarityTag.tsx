import type { ReactNode } from "react";

// A local type, not imported from domain — interfaces/ orchestrates
// application DTOs, never reaches into domain directly. This mirrors
// domain's TrinketRarity union (see domain/value-objects/Trinket.ts).
type TrinketRarity = "common" | "rare" | "epic" | "legendary";

const RARITY_STYLES: Record<TrinketRarity, string> = {
  common: "bg-gray-100 text-gray-600",
  rare: "bg-sky-100 text-sky-700",
  epic: "bg-violet-100 text-violet-700",
  legendary: "bg-amber-100 text-amber-800",
};

/** Text-only color per rarity, for coloring a trinket's NAME (Collection cards, box reveal). */
export const RARITY_TEXT: Record<TrinketRarity, string> = {
  common: "text-gray-600",
  rare: "text-sky-700",
  epic: "text-violet-700",
  legendary: "text-amber-700",
};

/** A small [RARE]-style tag. High-contrast tinted pairs, never gray-on-gray. */
export function RarityTag({ rarity }: { rarity: TrinketRarity }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${RARITY_STYLES[rarity]}`}
    >
      {rarity}
    </span>
  );
}

const RAINBOW_GRADIENT =
  "linear-gradient(90deg, #ff4785, #ff9a3c, #f2d024, #33c17a, #3ba3e0, #a259e0, #ff4785)";

/** Battle-pass-exclusive trinkets aren't in the shop's rarity system at all — they get their own tag, a constantly spinning rainbow gradient (2026-07-21). */
export function LimitedEditionTag() {
  return (
    <span
      className="animate-rainbow-spin rounded-full bg-[length:200%_100%] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
      style={{ backgroundImage: RAINBOW_GRADIENT }}
    >
      Limited edition
    </span>
  );
}

/** Same rainbow treatment, applied to a trinket's NAME text instead of a pill — for the box reveal / Collection cards. */
export function LimitedEditionName({ children }: { children: ReactNode }) {
  return (
    <span
      className="animate-rainbow-spin bg-[length:200%_100%] bg-clip-text text-transparent"
      style={{ backgroundImage: RAINBOW_GRADIENT }}
    >
      {children}
    </span>
  );
}
