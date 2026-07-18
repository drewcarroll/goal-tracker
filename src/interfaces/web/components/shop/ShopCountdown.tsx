"use client";

import { useEffect, useState } from "react";

function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function format(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/** Ticking "refreshes in Xh Ym" — the offer itself is keyed by calendar date, so it turns over at local midnight. */
export function ShopCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    setRemaining(msUntilMidnight());
    const id = setInterval(() => setRemaining(msUntilMidnight()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="text-xs font-medium text-gray-500">
      Refreshes in {remaining === null ? "…" : format(remaining)}
    </span>
  );
}
