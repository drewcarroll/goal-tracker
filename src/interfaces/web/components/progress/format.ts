/** Renders a number without noise: integers as-is, otherwise up to 2 decimals. */
export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

/** The actual logged total "to date" — the last week that has data (non-null). */
export function actualToDate(cumulativeActuals: ReadonlyArray<number | null>): number {
  for (let i = cumulativeActuals.length - 1; i >= 0; i -= 1) {
    const value = cumulativeActuals[i];
    if (value !== null && value !== undefined) return value;
  }
  return 0;
}

/** Completion share of the projected total, clamped to [0, 100]. */
export function completionPercent(actual: number, projectedTotal: number): number {
  if (projectedTotal <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((actual / projectedTotal) * 100)));
}
