"use client";

import { useState, useTransition } from "react";
import { COLOR_THEMES, type ColorThemeId } from "@/interfaces/web/http/session";
import { setThemeAction } from "@/interfaces/web/app/(app)/profile/actions";

/** A row of swatches — tapping one applies it immediately (no save button needed). */
export function ThemePicker({ current }: { current: ColorThemeId }) {
  const [active, setActive] = useState(current);
  const [, startTransition] = useTransition();

  function choose(themeId: ColorThemeId) {
    setActive(themeId);
    document.documentElement.setAttribute("data-theme", themeId);
    // Keeps the mobile browser's own chrome (top status bar, Safari's bottom
    // toolbar) in sync instantly instead of waiting for a full page reload.
    const swatch = COLOR_THEMES.find((t) => t.id === themeId)?.swatch;
    if (swatch) {
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", swatch);
    }
    startTransition(async () => {
      await setThemeAction(themeId);
    });
  }

  return (
    <div className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm">
      <h3 className="font-display font-semibold text-gray-900">Appearance</h3>
      <p className="mt-1 text-sm text-gray-600">Pick a color theme.</p>
      <div className="mt-3 flex gap-3">
        {COLOR_THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => choose(theme.id)}
            aria-pressed={active === theme.id}
            aria-label={theme.label}
            title={theme.label}
            className={`h-11 w-11 shrink-0 rounded-full border-2 transition-transform active:scale-95 ${
              active === theme.id
                ? "border-gray-900 shadow-sm"
                : "border-transparent hover:border-gray-300"
            }`}
            style={{ backgroundColor: theme.swatch }}
          />
        ))}
      </div>
    </div>
  );
}
