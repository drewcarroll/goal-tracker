import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Goal Tracker",
  description: "Track and achieve your goals — built with Next.js & Clean Architecture.",
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
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh pb-safe-bottom pl-safe-left pr-safe-right pt-safe-top">
        {children}
      </body>
    </html>
  );
}
