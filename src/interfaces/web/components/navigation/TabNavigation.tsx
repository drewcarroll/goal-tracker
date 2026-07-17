"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./navItems";

/** A tab is active for its exact route and any nested child route. */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Primary navigation shell.
 *
 * - Mobile (< lg): a floating frosted-glass bottom bar, kept within thumb
 *   reach and clear of the iOS home indicator via the `safe-bottom` token.
 * - Desktop (>= lg): a sticky side-nav rail.
 *
 * Exactly one of the two `<nav>` elements is rendered (`display: none` on the
 * other), so only one navigation landmark is exposed to assistive tech at a
 * time. Active state is derived from the current pathname.
 */
export function TabNavigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: side-nav rail */}
      <nav
        aria-label="Primary"
        className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:gap-1 lg:border-r lg:border-gray-900/5 lg:bg-white/70 lg:px-3 lg:py-6 lg:backdrop-blur-xl"
      >
        <span className="px-3 pb-4 text-lg font-bold tracking-tight text-brand">Goal Tracker</span>
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-brand text-white shadow-sm shadow-brand/30"
                  : "text-gray-600 hover:bg-gray-900/5 hover:text-gray-900",
              ].join(" ")}
            >
              <item.Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile: floating frosted bottom tab bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 mb-safe-bottom pl-safe-left pr-safe-right lg:hidden"
      >
        <ul className="mx-3 mb-2 flex rounded-2xl border border-gray-900/10 bg-white/80 shadow-lg shadow-gray-900/10 backdrop-blur-xl">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors active:scale-95",
                    active ? "text-brand" : "text-gray-500",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-7 items-center justify-center rounded-full px-3.5 transition-colors",
                      active ? "bg-brand/10" : "",
                    ].join(" ")}
                  >
                    <item.Icon className="h-[22px] w-[22px]" aria-hidden="true" />
                  </span>
                  <span className={item.compactLabelOnMobile ? "hidden sm:inline" : undefined}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
