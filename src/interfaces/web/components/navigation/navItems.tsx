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

function ShopIcon(props: IconProps) {
  return (
    <svg {...baseIconProps} {...props}>
      <path d="M4 9.5 5.5 4h13L20 9.5" />
      <path d="M4 9.5h16V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5Z" />
      <path d="M9 13a3 3 0 0 0 6 0" />
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
  /** Icon-only below `sm:` on the mobile tab bar — keeps 5 tabs from feeling cramped on a phone. */
  compactLabelOnMobile?: boolean;
}

/**
 * The primary tabs, in display order. Down to 5 as of 2026-07-18 (user
 * feedback: 6 was too many) — Schedule folded into the end-of-day flow on
 * Home, and the old single "Trinkets" tab split: Shop is its own tab,
 * Collection + the battle-pass calendar moved into Profile.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/home", label: "Home", Icon: HomeIcon },
  { href: "/goals", label: "Goals", Icon: GoalsIcon },
  { href: "/shop", label: "Shop", Icon: ShopIcon, compactLabelOnMobile: true },
  { href: "/friends", label: "Friends", Icon: FriendsIcon, compactLabelOnMobile: true },
  { href: "/profile", label: "Profile", Icon: ProfileIcon },
];
