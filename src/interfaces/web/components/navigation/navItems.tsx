import type { ComponentType, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseIconProps: IconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function HomeIcon(props: IconProps) {
  return (
    <svg {...baseIconProps} {...props}>
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5Z" />
    </svg>
  );
}

function GoalsIcon(props: IconProps) {
  return (
    <svg {...baseIconProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

function ScheduleIcon(props: IconProps) {
  return (
    <svg {...baseIconProps} {...props}>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3.5 10h17" />
    </svg>
  );
}

function FriendsIcon(props: IconProps) {
  return (
    <svg {...baseIconProps} {...props}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 20c1-3.5 3-5.5 5.5-5.5s4.5 2 5.5 5.5" />
      <path d="M16 8.5a3 3 0 1 0 0-6" />
      <path d="M17.5 14.75c1.9.55 3 2.3 3.75 5.25" />
    </svg>
  );
}

function TrinketsIcon(props: IconProps) {
  return (
    <svg {...baseIconProps} {...props}>
      <path d="M12 3 4 8.5 12 14l8-5.5L12 3Z" />
      <path d="M4 8.5V16l8 5.5" />
      <path d="M20 8.5V16l-8 5.5" />
      <path d="M12 14v7.5" />
    </svg>
  );
}

function ProfileIcon(props: IconProps) {
  return (
    <svg {...baseIconProps} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20.5c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
    </svg>
  );
}

export interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<IconProps>;
  /** Icon-only below `sm:` on the mobile tab bar — 6 tabs is tight for full labels on a phone. */
  compactLabelOnMobile?: boolean;
}

/**
 * The primary tabs, in display order. Progress folded into Goals (each
 * goal's graph lives on its own card / detail page) and History folded into
 * Profile (2026-07-16, Phase 10). Friends and Trinkets (battle pass + shop +
 * collection + feed, one tab internally segmented, not four) both added in
 * Phase 11 — see docs/plan.md.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/home", label: "Home", Icon: HomeIcon },
  { href: "/goals", label: "Goals", Icon: GoalsIcon },
  { href: "/plan", label: "Schedule", Icon: ScheduleIcon },
  { href: "/friends", label: "Friends", Icon: FriendsIcon, compactLabelOnMobile: true },
  { href: "/trinkets", label: "Trinkets", Icon: TrinketsIcon, compactLabelOnMobile: true },
  { href: "/profile", label: "Profile", Icon: ProfileIcon },
];
