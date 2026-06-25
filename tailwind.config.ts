import type { Config } from "tailwindcss";

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
          DEFAULT: "#4f46e5",
          dark: "#4338ca",
        },
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
