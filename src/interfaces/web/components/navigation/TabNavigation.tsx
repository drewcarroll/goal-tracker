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
 * - Mobile (< lg): a fixed bottom tab bar, kept within thumb reach and clear
 *   of the iOS home indicator via the `safe-bottom` inset token.
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
        className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:gap-1 lg:border-r lg:border-gray-200 lg:bg-white lg:px-3 lg:py-6"
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
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand/10 text-brand"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              ].join(" ")}
            >
              <item.Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile: fixed bottom tab bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-safe-bottom pl-safe-left pr-safe-right lg:hidden"
      >
        <ul className="flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                    active ? "text-brand" : "text-gray-500 hover:text-gray-900",
                  ].join(" ")}
                >
                  <item.Icon className="h-6 w-6" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
