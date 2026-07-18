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

/** Battle-pass-exclusive trinkets aren't in the shop's rarity system at all — they get their own tag. */
export function LimitedEditionTag() {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
      style={{
        backgroundImage:
          "linear-gradient(90deg, #ff4785, #ff9a3c, #f2d024, #33c17a, #3ba3e0, #a259e0)",
      }}
    >
      Limited edition
    </span>
  );
}
