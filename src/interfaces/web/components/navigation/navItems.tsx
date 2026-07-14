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

function ProgressIcon(props: IconProps) {
  return (
    <svg {...baseIconProps} {...props}>
      <path d="M4 5v14h16" />
      <path d="M7 15l3.5-4 3 2.5L20 8" />
    </svg>
  );
}

function HistoryIcon(props: IconProps) {
  return (
    <svg {...baseIconProps} {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 4v4h4" />
      <path d="M12 8v4l3 2" />
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
}

/** The primary tabs, in display order. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/home", label: "Home", Icon: HomeIcon },
  { href: "/goals", label: "Goals", Icon: GoalsIcon },
  { href: "/progress", label: "Progress", Icon: ProgressIcon },
  { href: "/history", label: "History", Icon: HistoryIcon },
  { href: "/profile", label: "Profile", Icon: ProfileIcon },
];
