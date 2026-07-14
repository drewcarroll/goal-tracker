import { rankVisual } from "./rankColors";

/**
 * The rank badge: a gradient-filled circle with the rank number, whose color
 * scheme, rings, and glow come from the programmatic rank visuals. `size`
 * swaps the header chip for /profile's hero badge.
 */
export function RankBadge({ rank, size = "sm" }: { rank: number; size?: "sm" | "md" | "lg" }) {
  const visual = rankVisual(rank);
  const dimensions =
    size === "lg"
      ? "h-16 w-16 text-2xl font-bold"
      : size === "md"
        ? "h-9 w-9 text-sm font-bold"
        : "h-5 w-5 text-[11px] font-semibold";

  const ringShadow =
    visual.tier >= 2
      ? `0 0 0 2px #fff, 0 0 0 3.5px ${visual.ring}`
      : `0 0 0 1.5px ${visual.ring}`;

  return (
    <span
      aria-label={`Rank ${rank}`}
      title={`Rank ${rank}`}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full text-white ${dimensions}`}
      style={{
        background:
          visual.tier >= 1
            ? `linear-gradient(135deg, ${visual.from}, ${visual.to})`
            : visual.color,
        boxShadow: visual.glow ? `${ringShadow}, ${visual.glow}` : ringShadow,
      }}
    >
      {rank}
    </span>
  );
}
