import { rankVisual } from "./rankColors";

const CLIP_PATHS: Record<string, string | undefined> = {
  circle: undefined, // handled via border-radius below, no clip-path needed
  squircle: undefined, // also border-radius, just a smaller radius than a circle
  hexagon: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
  diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  pentagon: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
  octagon:
    "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
};

const SIZE_CLASSES: Record<"sm" | "md" | "lg", { box: string; text: string }> = {
  lg: { box: "h-16 w-16", text: "text-2xl font-bold" },
  md: { box: "h-9 w-9", text: "text-sm font-bold" },
  sm: { box: "h-5 w-5", text: "text-[11px] font-semibold" },
};

/**
 * The rank badge: a gradient-filled shape with the rank number. Color,
 * shape, and ring thickness all come from `rankVisual` so every single rank
 * reads as visually distinct, not just every 5th (see rankColors.ts).
 * `size` swaps the header chip for /profile's hero badge.
 *
 * Three nested layers, not one: `clip-path` clips EVERYTHING an element
 * renders, including its own box-shadow — so a ring or glow drawn as a
 * box-shadow on a clipped (non-circle) shape would get sliced off at the
 * shape's exact edge instead of hugging or diffusing past it. The glow
 * lives on the outer (unclipped) span, the ring is a padding-revealed fill
 * on the middle span, and the actual color + rank number sit on the inner
 * span — each clipped to the same shape so they nest correctly.
 */
export function RankBadge({ rank, size = "sm" }: { rank: number; size?: "sm" | "md" | "lg" }) {
  const visual = rankVisual(rank);
  const { box, text } = SIZE_CLASSES[size];
  const clipPath = CLIP_PATHS[visual.shape];
  const borderRadius = clipPath ? undefined : visual.shape === "squircle" ? "28%" : "9999px";
  const ringThickness = visual.tier >= 2 ? visual.ringWidth + 2 : visual.ringWidth;

  return (
    <span
      aria-label={`Rank ${rank}`}
      title={`Rank ${rank}`}
      className={`inline-flex shrink-0 select-none ${box}`}
      style={{ boxShadow: visual.glow || undefined, borderRadius }}
    >
      <span
        className="flex h-full w-full items-center justify-center"
        style={{ background: visual.ring, clipPath, borderRadius, padding: ringThickness }}
      >
        <span
          className={`flex h-full w-full items-center justify-center text-white ${text}`}
          style={{
            background:
              visual.tier >= 1
                ? `linear-gradient(135deg, ${visual.from}, ${visual.to})`
                : visual.color,
            clipPath,
            borderRadius,
          }}
        >
          {rank}
        </span>
      </span>
    </span>
  );
}
