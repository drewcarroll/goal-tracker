/** Shared chart palette, kept in sync with the app's Tailwind tokens. */
export const CHART_COLORS = {
  brand: "#7c3aed", // brand (violet-600)
  actual: "#10b981", // emerald-500 — logged/actual
  target: "#9ca3af", // gray-400 — target reference
  track: "#e5e7eb", // gray-200 — empty track / future weeks
  grid: "#f1f5f9", // slate-100 — gridlines
  axis: "#9ca3af", // gray-400 — axis tick labels
  axisLine: "#e5e7eb", // gray-200 — axis lines
  pass: "#10b981", // emerald-500 — "if you pass" ghost projection
  fail: "#ef4444", // red-500 — "if you fail" ghost projection
} as const;
