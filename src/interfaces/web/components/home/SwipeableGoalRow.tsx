"use client";

import { useRef, useState } from "react";
import { playDing } from "@/interfaces/web/lib/playDing";

const SWIPE_THRESHOLD = 76;

/**
 * A goal row you can swipe to mark — right for done (plays a little chime),
 * left for missed. Explicit ✓/✗ buttons stay visible as the reliable,
 * accessible control; the swipe is the fun layer on top, not the only way in.
 */
export function SwipeableGoalRow({
  name,
  passed,
  onMark,
}: {
  name: string;
  passed: boolean | null;
  onMark: (passed: boolean) => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const pointerId = useRef<number | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    startX.current = e.clientX;
    pointerId.current = e.pointerId;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || pointerId.current !== e.pointerId) return;
    setDragX(e.clientX - startX.current);
  }

  function settle(next: boolean | null) {
    setDragging(false);
    setDragX(0);
    pointerId.current = null;
    if (next !== null) {
      onMark(next);
      if (next) playDing();
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (pointerId.current !== e.pointerId) return;
    if (dragX > SWIPE_THRESHOLD) settle(true);
    else if (dragX < -SWIPE_THRESHOLD) settle(false);
    else settle(null);
  }

  const revealPass = dragX > 12;
  const revealFail = dragX < -12;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Swipe-reveal backdrop: green to the left (swiping right = done), red to the right. */}
      <div
        aria-hidden
        className={`absolute inset-0 flex items-center justify-between px-5 text-white transition-colors ${
          revealPass ? "bg-emerald-500" : revealFail ? "bg-red-500" : "bg-transparent"
        }`}
      >
        <span className={`font-display text-sm font-bold ${revealPass ? "opacity-100" : "opacity-0"}`}>
          Done ✓
        </span>
        <span className={`font-display text-sm font-bold ${revealFail ? "opacity-100" : "opacity-0"}`}>
          Missed ✗
        </span>
      </div>

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => settle(null)}
        style={{ transform: `translateX(${dragX}px)`, touchAction: "pan-y" }}
        className={`relative flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm select-none ${
          dragging ? "" : "transition-transform"
        } ${
          passed === true
            ? "border-emerald-300"
            : passed === false
              ? "border-red-300"
              : "border-gray-900/[0.06]"
        }`}
      >
        <span className="truncate font-medium text-gray-900">{name}</span>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => settle(true)}
            aria-pressed={passed === true}
            aria-label={`Mark ${name} done`}
            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-base font-bold transition-colors ${
              passed === true
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-gray-300 bg-white text-gray-400 hover:border-emerald-400"
            }`}
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => settle(false)}
            aria-pressed={passed === false}
            aria-label={`Mark ${name} missed`}
            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-base font-bold transition-colors ${
              passed === false
                ? "border-red-500 bg-red-500 text-white"
                : "border-gray-300 bg-white text-gray-400 hover:border-red-400"
            }`}
          >
            ✗
          </button>
        </div>
      </div>
    </div>
  );
}
