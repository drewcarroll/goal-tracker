/**
 * Programmatic rank visuals (presentation-only; the domain knows numbers).
 *
 * Design rules (docs/progression.md §2.3):
 * - Every rank gets its own scheme, hues travelling steadily from warm and
 *   muted (rank 1, stone) through bronze, green, teal, blue, indigo, violet
 *   to fuchsia by rank 30. Adjacent ranks differ by ~9 degrees of hue, so
 *   rank 20 and 21 read as siblings, not strangers.
 * - Saturation and depth rise with rank; every 5 ranks a "tier" adds one
 *   ornament (gradient fill, double ring, glow) so climbing keeps paying
 *   visually without becoming a carnival.
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
}

export function rankVisual(rank: number): RankVisual {
  const t = Math.min(Math.max(rank, 1) - 1, 29) / 29; // 0..1 across ranks 1..30
  const hue = 30 + 270 * t; // stone/bronze → green → blue → violet → fuchsia
  const sat = 15 + 65 * t;
  const light = 47 - 5 * t;
  const tier = Math.min(6, Math.floor((Math.max(rank, 1) - 1) / 5));

  const color = `hsl(${hue.toFixed(0)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%)`;
  const from = `hsl(${hue.toFixed(0)}, ${Math.min(90, sat + 12).toFixed(0)}%, ${(light + 6).toFixed(0)}%)`;
  const to = `hsl(${(hue + 24).toFixed(0)}, ${Math.min(92, sat + 18).toFixed(0)}%, ${(light - 8).toFixed(0)}%)`;
  const ring = `hsla(${hue.toFixed(0)}, ${sat.toFixed(0)}%, ${(light - 5).toFixed(0)}%, ${tier >= 1 ? 0.85 : 0.45})`;
  const glow =
    tier >= 3
      ? `0 0 ${6 + tier * 4}px hsla(${hue.toFixed(0)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%, 0.5)`
      : "";

  return { tier, color, from, to, ring, glow };
}
