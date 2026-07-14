"use client";

import { useState, useTransition } from "react";
import { updateCheckInWindowAction } from "@/interfaces/web/app/(app)/profile/actions";

/**
 * The nightly check-in window: opens in the afternoon, closes the next
 * morning. Validation (end < 12:00 ≤ start) is enforced server-side; this
 * form just collects the times.
 */
export function WindowSettingsForm({ start, end }: { start: string; end: string }) {
  const [startValue, setStartValue] = useState(start);
  const [endValue, setEndValue] = useState(end);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateCheckInWindowAction(startValue, endValue);
      if (result.ok) setSaved(true);
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="font-semibold text-gray-900">Check-in window</h2>
        <p className="mt-1 text-sm text-gray-600">
          Your nightly log is available from the opening time until the deadline the next morning.
          Miss the deadline and that night&apos;s rank point is gone — nothing else happens.
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Saved.
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1 text-sm font-medium text-gray-700">
          Opens (afternoon)
          <input
            type="time"
            value={startValue}
            onChange={(e) => setStartValue(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-base text-gray-900 shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <label className="flex-1 text-sm font-medium text-gray-700">
          Deadline (next morning)
          <input
            type="time"
            value={endValue}
            onChange={(e) => setEndValue(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-base text-gray-900 shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={pending}
        className="self-start rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save window"}
      </button>
    </div>
  );
}
