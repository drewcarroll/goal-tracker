/**
 * Programmatic rank visuals (presentation-only; the domain knows numbers).
 *
 * Design rules (docs/progression.md §2.3, revised 2026-07-16 — Phase 11):
 * every rank must be noticeably distinct from its neighbor, not just every
 * 5th ("tier") rank. Ranks 1-5 tick by fastest (RankService's cost curve is
 * cheapest early) and were the least differentiated under the old
 * continuous-hue scheme, so the fix has to work from rank 1, not just from
 * the first tier boundary onward:
 *
 * - Hue jumps a full ~47° PER RANK (`hue(rank) = (rank·47) mod 360`) instead
 *   of interpolating smoothly across 1-30 — adjacent ranks are now as
 *   different as, say, red vs. yellow-green, not "the same color, a bit
 *   warmer." (A 47° step avoids ever landing on a short low-order cycle the
 *   way a round number like 45° or 60° would.)
 * - Saturation/lightness still rise with TIER (every 5 ranks,
 *   `floor((rank-1)/5)`, capped at 6 for that part) — climbing still reads
 *   as "getting more powerful" on top of the per-rank hue jump.
 * - Badge SHAPE cycles every tier via `RankBadge`'s clip-path, uncapped (it
 *   keeps cycling past rank 30 rather than freezing at the tier-6 shape):
 *   circle → hexagon → squircle → diamond → pentagon → octagon → circle...
 * - Ring thickness alternates 2px/3px by rank PARITY (not tier), so even
 *   two adjacent ranks that land in the same shape/tier still differ on
 *   touch. Border STYLE (dashed/dotted) was considered and rejected —
 *   illegible at the 20px header-chip size this app already ships.
 */
export interface RankVisual {
  tier: number;
  /** Solid accent (username text, bar hints). */
  color: string;
  /** Gradient stops for badge and progress-bar fills. */
  from: string;
  to: string;
  /** Ring color around the badge. */
  ring: string;
  /** Extra box-shadow for high tiers ("" for none). */
  glow: string;
  /** Which shape RankBadge should clip the badge to. */
  shape: "circle" | "hexagon" | "squircle" | "diamond" | "pentagon" | "octagon";
  /** Ring thickness in px — alternates by rank parity, independent of tier. */
  ringWidth: number;
}

const SHAPES = ["circle", "hexagon", "squircle", "diamond", "pentagon", "octagon"] as const;

export function rankVisual(rank: number): RankVisual {
  const safeRank = Math.max(rank, 1);
  const tier = Math.min(6, Math.floor((safeRank - 1) / 5));
  const tierForBands = Math.min(6, tier) / 6; // 0..1, still used for sat/light escalation

  const hue = (safeRank * 47) % 360;
  const sat = 30 + 55 * tierForBands;
  const light = 47 - 5 * tierForBands;

  const color = `hsl(${hue.toFixed(0)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%)`;
  const from = `hsl(${hue.toFixed(0)}, ${Math.min(90, sat + 12).toFixed(0)}%, ${(light + 6).toFixed(0)}%)`;
  const to = `hsl(${(hue + 24) % 360}, ${Math.min(92, sat + 18).toFixed(0)}%, ${(light - 8).toFixed(0)}%)`;
  const ring = `hsla(${hue.toFixed(0)}, ${sat.toFixed(0)}%, ${(light - 5).toFixed(0)}%, ${tier >= 1 ? 0.85 : 0.45})`;
  const glow =
    tier >= 3
      ? `0 0 ${6 + tier * 4}px hsla(${hue.toFixed(0)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%, 0.5)`
      : "";

  const shapeIndex = Math.floor((safeRank - 1) / 5) % SHAPES.length;
  const shape = SHAPES[shapeIndex]!;
  const ringWidth = safeRank % 2 === 0 ? 2 : 3;

  return { tier, color, from, to, ring, glow, shape, ringWidth };
}
