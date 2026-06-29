"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { GoalHistoryDTO, HistoryWeekDTO } from "@/application/dtos/HistoryDTO";
import type { LogDTO } from "@/application/dtos/LogDTO";
import { deleteLogAction, addLogToWeekAction } from "@/interfaces/web/app/(app)/history/actions";

const DAY_MS = 24 * 60 * 60 * 1000;

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

/** "Jan 12 – Jan 18" — endDate is exclusive, so show the last included day (UTC). */
function formatWeekRange(week: HistoryWeekDTO): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
  const start = new Date(week.startDate);
  const lastDay = new Date(new Date(week.endDate).getTime() - DAY_MS);
  return `${start.toLocaleDateString(undefined, opts)} – ${lastDay.toLocaleDateString(undefined, opts)}`;
}

/** When the entry was recorded (real timestamp, shown in the viewer's zone). */
function formatLoggedAt(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function weekBadge(kind: HistoryWeekDTO["kind"]): { label: string; className: string } | null {
  if (kind === "current")
    return { label: "This week", className: "bg-emerald-50 text-emerald-700" };
  if (kind === "future") return { label: "Upcoming", className: "bg-gray-100 text-gray-500" };
  return null;
}

export function HistoryView({ histories }: { histories: GoalHistoryDTO[] }) {
  const [selectedId, setSelectedId] = useState<string>(histories[0]?.goalId ?? "");

  if (histories.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="text-gray-600">No goals yet — nothing to look back on.</p>
        <Link
          href="/goals"
          className="mt-4 inline-block rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          Create a goal
        </Link>
      </div>
    );
  }

  const selected = histories.find((h) => h.goalId === selectedId) ?? histories[0]!;
  // Newest week first — reviewing recent history is the common case.
  const weeks = [...selected.weeks].reverse();

  return (
    <div className="flex flex-col gap-5">
      {histories.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Choose a goal">
          {histories.map((h) => {
            const active = h.goalId === selected.goalId;
            return (
              <button
                key={h.goalId}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedId(h.goalId)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand text-white shadow-sm"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {h.goalName}
              </button>
            );
          })}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {weeks.map((week) => (
          <WeekCard
            key={week.index}
            goalId={selected.goalId}
            unit={selected.unit}
            week={week}
          />
        ))}
      </ul>
    </div>
  );
}

function WeekCard({
  goalId,
  unit,
  week,
}: {
  goalId: string;
  unit: string;
  week: HistoryWeekDTO;
}) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const badge = weekBadge(week.kind);
  const canLog = week.kind !== "future"; // can't log a week that hasn't started

  function handleDelete(logId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteLogAction(goalId, logId);
      if (!result.ok) setError(result.error);
    });
  }

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await addLogToWeekAction(goalId, week.index, value);
      if (result.ok) {
        setValue("");
        setAdding(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900">Week {week.index + 1}</h2>
          {badge && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          )}
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
          {formatNumber(week.total)}
          <span className="font-normal text-gray-400">
            {" / "}
            {formatNumber(week.weeklyTarget)} {unit}
          </span>
        </span>
      </div>
      <p className="mt-0.5 text-xs text-gray-400">{formatWeekRange(week)}</p>

      {week.entries.length > 0 ? (
        <ul className="mt-3 flex flex-col divide-y divide-gray-100">
          {week.entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              unit={unit}
              disabled={pending}
              onDelete={() => handleDelete(entry.id)}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gray-400">No entries logged for this week.</p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-3">
        {canLog ? (
          adding ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={`Amount in ${unit}`}
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-base text-gray-900 shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={pending || !value.trim()}
                className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60"
              >
                {pending ? "Adding…" : "Add"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setValue("");
                  setError(null);
                }}
                disabled={pending}
                className="shrink-0 rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              + Add to this week
            </button>
          )
        ) : (
          <p className="text-xs text-gray-400">This week hasn’t started yet.</p>
        )}
      </div>
    </li>
  );
}

function EntryRow({
  entry,
  unit,
  disabled,
  onDelete,
}: {
  entry: LogDTO;
  unit: string;
  disabled: boolean;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm tabular-nums text-gray-800">
        <span className="font-semibold text-gray-900">
          +{formatNumber(entry.value)} {unit}
        </span>
        <span className="ml-2 text-xs text-gray-400">logged {formatLoggedAt(entry.createdAt)}</span>
      </span>
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        aria-label={`Delete entry of ${formatNumber(entry.value)} ${unit}`}
        className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
      >
        Delete
      </button>
    </li>
  );
}
