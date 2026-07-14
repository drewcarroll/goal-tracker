import { rankStyle } from "./rankColors";

/**
 * The filled circle with the rank number — the visible payoff of the nightly
 * log progression. `size` swaps the header chip for /profile's hero badge.
 */
export function RankBadge({ rank, size = "sm" }: { rank: number; size?: "sm" | "lg" }) {
  const style = rankStyle(rank);
  const dimensions =
    size === "lg" ? "h-16 w-16 text-2xl font-bold" : "h-5 w-5 text-[11px] font-semibold";
  return (
    <span
      aria-label={`Rank ${rank}`}
      title={`Rank ${rank}`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-white ${style.badge} ${dimensions}`}
    >
      {rank}
    </span>
  );
}
