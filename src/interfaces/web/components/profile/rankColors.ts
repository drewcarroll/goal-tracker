/**
 * Presentation-only color scale for ranks (domain knows numbers, not colors).
 * One entry per rank, 1-based, gray → gold; ranks past the end reuse the last
 * entry. Tailwind classes must appear as full literals so the JIT sees them.
 */
const RANK_STYLES: { name: string; text: string; badge: string }[] = [
  { name: "Gray", text: "text-gray-600", badge: "bg-gray-500" },
  { name: "Bronze", text: "text-amber-700", badge: "bg-amber-600" },
  { name: "Green", text: "text-emerald-600", badge: "bg-emerald-600" },
  { name: "Teal", text: "text-teal-600", badge: "bg-teal-600" },
  { name: "Sky", text: "text-sky-600", badge: "bg-sky-600" },
  { name: "Blue", text: "text-blue-600", badge: "bg-blue-600" },
  { name: "Indigo", text: "text-indigo-600", badge: "bg-indigo-600" },
  { name: "Violet", text: "text-violet-600", badge: "bg-violet-600" },
  { name: "Purple", text: "text-purple-600", badge: "bg-purple-600" },
  { name: "Fuchsia", text: "text-fuchsia-600", badge: "bg-fuchsia-600" },
  { name: "Rose", text: "text-rose-600", badge: "bg-rose-600" },
  { name: "Orange", text: "text-orange-500", badge: "bg-orange-500" },
  { name: "Amber", text: "text-amber-500", badge: "bg-amber-500" },
  { name: "Yellow", text: "text-yellow-500", badge: "bg-yellow-500" },
  { name: "Gold", text: "text-yellow-400", badge: "bg-yellow-400" },
];

export function rankStyle(rank: number): { name: string; text: string; badge: string } {
  const index = Math.min(Math.max(rank, 1), RANK_STYLES.length) - 1;
  return RANK_STYLES[index]!;
}
