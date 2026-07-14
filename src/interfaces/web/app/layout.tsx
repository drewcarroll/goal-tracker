import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font; no runtime request to Google.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

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
  themeColor: "#7c3aed",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh pb-safe-bottom pl-safe-left pr-safe-right pt-safe-top font-sans">
        {children}
      </body>
    </html>
  );
}
