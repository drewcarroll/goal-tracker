import type { Config } from "tailwindcss";

/**
 * Builds a Tailwind color that reads from a CSS custom property holding a
 * space-separated RGB triple (e.g. "255 77 141"), so `bg-brand/10` etc. keep
 * working with the opacity modifier while the actual color lives in
 * globals.css and can be swapped per `data-theme` for the theme picker
 * (Profile > Advanced > Appearance).
 */
function withOpacity(variableName: string) {
  return ({ opacityValue }: { opacityValue?: string }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variableName}) / ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

const config: Config = {
  content: ["./src/interfaces/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    // Mobile-first breakpoints (min-width). Unprefixed utilities target the
    // smallest screens; each named breakpoint layers styles on top for larger
    // viewports. `xs` matches typical iPhone logical widths.
    screens: {
      xs: "390px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        brand: {
          DEFAULT: withOpacity("--brand") as unknown as string,
          dark: withOpacity("--brand-dark") as unknown as string,
          light: withOpacity("--brand-light") as unknown as string,
        },
      },
      fontFamily: {
        sans: [
          "var(--font-body)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        display: ["var(--font-display)", "var(--font-body)", "-apple-system", "sans-serif"],
      },
      // iOS safe-area insets exposed as spacing tokens so utilities like
      // `pt-safe-top` / `pb-safe-bottom` respect the notch and home indicator.
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
      },
    },
  },
  plugins: [],
};

export default config;
