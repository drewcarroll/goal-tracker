import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Nunito, Baloo_2 } from "next/font/google";
import { cookies } from "next/headers";
import { THEME_COOKIE, DEFAULT_COLOR_THEME, isValidColorTheme } from "@/interfaces/web/http/session";
import "./globals.css";

// Self-hosted at build time by next/font; no runtime request to Google.
// Nunito (body): warm, rounded, still very readable at small sizes.
// Baloo 2 (display): bubblier weight for headings/numbers — the app's
// "cute" identity leans on this pairing rather than a single neutral face.
const nunito = Nunito({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Goal Tracker",
  description: "Track and achieve your goals, built with Next.js & Clean Architecture.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Goal Tracker",
  },
};

// `viewportFit: "cover"` is required for the CSS `env(safe-area-inset-*)`
// values to resolve to non-zero on notched iPhones; without it the insets
// are always 0 and the safe-area padding has no effect.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ff4785",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const rawTheme = cookies().get(THEME_COOKIE)?.value ?? "";
  const theme = isValidColorTheme(rawTheme) ? rawTheme : DEFAULT_COLOR_THEME;

  return (
    <html lang="en" data-theme={theme} className={`${nunito.variable} ${baloo.variable}`}>
      <body className="min-h-dvh pb-safe-bottom pl-safe-left pr-safe-right pt-safe-top font-sans">
        {children}
      </body>
    </html>
  );
}
