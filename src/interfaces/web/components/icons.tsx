import type { SVGProps } from "react";

/**
 * Shared UI icons: small inline SVGs, stroke-based, sized via className.
 * The app uses these instead of emoji (crisper, consistent weight, and they
 * inherit currentColor).
 */
type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function LockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
    </svg>
  );
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 2.5 19.5a1 1 0 0 0 .87 1.5h17.26a1 1 0 0 0 .87-1.5L12 3Z" />
      <path d="M12 9v5" />
      <path d="M12 17.5v.01" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function WrenchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14.5 6.5a4.5 4.5 0 0 0-6 5.6L3 17.6V21h3.4l5.5-5.5a4.5 4.5 0 0 0 5.6-6L14 13l-3-3 3.5-3.5Z" />
    </svg>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />
    </svg>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="15" r="4" />
      <path d="m10.8 12.2 8.7-8.7" />
      <path d="m16 7 2.5 2.5" />
      <path d="m19 4 1.5 1.5" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3.5 10h17" />
    </svg>
  );
}

export function CoinIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.5" />
      <path d="M12 9v6" />
      <path d="M10 10.5c0-1 .8-1.5 2-1.5s2 .5 2 1.3-.8 1.2-2 1.4-2 .6-2 1.5.8 1.3 2 1.3 2-.5 2-1.5" />
    </svg>
  );
}
