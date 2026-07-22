/**
 * Cosmetic display cap for a trinket's level badge. The REAL level is just
 * the owned quantity (every duplicate is +1 level, guaranteed — no
 * exponential thresholds, per Drew's explicit 2026-07-21 correction) — this
 * only controls how the number is SHOWN, capped so the badge doesn't grow
 * without bound: "×1" .. "×8", then "×8+".
 */
export function formatTrinketLevel(quantity: number): string {
  const shown = Math.min(quantity, 8);
  return quantity > 8 ? `×${shown}+` : `×${shown}`;
}
