"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import type { GoalDTO, GoalWeekDTO } from "@/application/dtos/GoalDTO";
import {
  logProgressAction,
  type QuickLogFieldErrors,
  type QuickLogFormValues,
} from "@/interfaces/web/app/(app)/home/actions";

/** Renders a number without noise: integers as-is, otherwise up to 2 decimals. */
function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Jan 8 – Jan 14" — endDate is exclusive, so show the last included day. */
function formatWeekRange(week: GoalWeekDTO): string {
  // Week bounds are calendar dates pinned to UTC midnight; render them in UTC so
  // the days shown match the session regardless of the viewer's zone.
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
  const start = new Date(week.startDate);
  const lastDay = new Date(new Date(week.endDate).getTime() - DAY_MS);
  return `${start.toLocaleDateString(undefined, opts)} – ${lastDay.toLocaleDateString(undefined, opts)}`;
}

function weekName(week: GoalWeekDTO): string {
  return `Week ${week.index + 1}`;
}

const FIELD_CLASS =
  "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3.5 text-base text-gray-900 " +
  "shadow-sm outline-none transition-colors placeholder:text-gray-400 " +
  "focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-60";

const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-gray-700";

interface LogSuccess {
  goalName: string;
  value: number;
  unit: string;
  weekTotal: number;
  weekLabel: string;
}

export function QuickLogForm({
  goals,
  onLogged,
}: {
  goals: GoalDTO[];
  /** Called on a successful log with the re-projected goal, for live updates. */
  onLogged?: (goal: GoalDTO) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(goals[0]?.id ?? "");
  const [value, setValue] = useState("");
  // Backfill: when on, the entry targets `backfillWeek` instead of this week.
  const [backfill, setBackfill] = useState(false);
  const [backfillWeek, setBackfillWeek] = useState<number | null>(null);
  const [fieldErrors, setFieldErrors] = useState<QuickLogFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<LogSuccess | null>(null);
  const [pending, startTransition] = useTransition();
  const amountRef = useRef<HTMLInputElement>(null);

  const selectedGoal = goals.find((g) => g.id === selectedId);
  const unit = selectedGoal?.unit ?? "";
  const weeks = selectedGoal?.weeks ?? [];
  // Only weeks that have already started can be backfilled.
  const pastWeeks = weeks.filter((w) => w.kind === "past");
  const currentWeek = weeks.find((w) => w.kind === "current");
  // When the session has ended there is no "current" week; fall back to the last.
  const defaultTargetWeek = currentWeek ?? weeks[weeks.length - 1];

  const targetWeek: GoalWeekDTO | undefined = backfill
    ? weeks.find((w) => w.index === backfillWeek)
    : defaultTargetWeek;

  if (goals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="text-gray-600">You don&apos;t have any goals yet.</p>
        <Link
          href="/goals"
          className="mt-4 inline-block rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          Create a goal
        </Link>
      </div>
    );
  }

  function resetWeekTargeting() {
    setBackfill(false);
    setBackfillWeek(null);
  }

  function enableBackfill() {
    if (pastWeeks.length === 0) return;
    setSuccess(null);
    setBackfill(true);
    // Default to the most recent past week — the one most likely just missed.
    setBackfillWeek(pastWeeks[pastWeeks.length - 1]?.index ?? null);
    setFieldErrors((prev) => ({ ...prev, weekIndex: undefined }));
  }

  /** Lightweight client-side checks so users get feedback before a round-trip. */
  function validate(): QuickLogFieldErrors {
    const errors: QuickLogFieldErrors = {};
    if (!selectedId) errors.goalId = "Choose a goal";
    const amount = Number(value);
    if (!value.trim() || Number.isNaN(amount)) {
      errors.value = "Amount must be a number";
    } else if (amount <= 0) {
      errors.value = "Amount must be greater than zero";
    }
    if (backfill && backfillWeek === null) errors.weekIndex = "Choose a week";
    return errors;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }
    setFieldErrors({});

    const payload: QuickLogFormValues =
      backfill && backfillWeek !== null
        ? { goalId: selectedId, value, weekIndex: String(backfillWeek) }
        : { goalId: selectedId, value };

    startTransition(async () => {
      const result = await logProgressAction(payload);
      if (result.ok) {
        const loggedWeek = result.goal.weeks.find((w) => w.index === result.log.weekIndex);
        setSuccess({
          goalName: result.goal.name,
          value: result.log.value,
          unit: result.goal.unit,
          weekTotal: result.weekTotal,
          weekLabel: loggedWeek ? weekName(loggedWeek) : `Week ${result.log.weekIndex + 1}`,
        });
        // Hand the re-projected goal up so the week summary reflects it at once.
        onLogged?.(result.goal);
        // Keep the goal and chosen week selected, clear the amount, refocus.
        setValue("");
        amountRef.current?.focus();
      } else {
        setFormError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900">Log progress</h2>

      {success && (
        <p
          role="status"
          className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-gray-700"
        >
          Logged{" "}
          <span className="font-semibold text-gray-900">
            {formatNumber(success.value)} {success.unit}
          </span>{" "}
          to <span className="font-semibold text-gray-900">{success.goalName}</span>,{" "}
          {success.weekLabel}. That week:{" "}
          <span className="font-semibold text-gray-900">
            {formatNumber(success.weekTotal)} {success.unit}
          </span>
          .
        </p>
      )}

      {formError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div>
        <label htmlFor="quicklog-goal" className={LABEL_CLASS}>
          Goal
        </label>
        <select
          id="quicklog-goal"
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setSuccess(null);
            // Week structure differs per goal — drop any backfill targeting.
            resetWeekTargeting();
            setFieldErrors((prev) => ({ ...prev, goalId: undefined }));
          }}
          aria-invalid={Boolean(fieldErrors.goalId)}
          className={FIELD_CLASS}
        >
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.name}
            </option>
          ))}
        </select>
        {fieldErrors.goalId && <FieldError>{fieldErrors.goalId}</FieldError>}
      </div>

      {/* Target-week indicator: always shows exactly which week is being logged to. */}
      <div
        className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
          backfill ? "border-amber-300 bg-amber-50" : "border-brand/20 bg-brand/5"
        }`}
      >
        <div className="min-w-0">
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${
              backfill ? "text-amber-700" : "text-brand"
            }`}
          >
            {backfill ? "Backfilling" : currentWeek ? "Logging to this week" : "Logging to"}
          </p>
          {targetWeek ? (
            <p className="mt-0.5 truncate text-sm font-medium text-gray-900">
              {weekName(targetWeek)} · {formatWeekRange(targetWeek)}
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-gray-500">Pick a week below</p>
          )}
        </div>
        {backfill ? (
          <button
            type="button"
            onClick={resetWeekTargeting}
            className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100"
          >
            This week
          </button>
        ) : (
          <button
            type="button"
            onClick={enableBackfill}
            disabled={pastWeeks.length === 0}
            title={
              pastWeeks.length === 0 ? "No earlier weeks in this goal's session yet" : undefined
            }
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            Past week
          </button>
        )}
      </div>

      {backfill && (
        <div>
          <label htmlFor="quicklog-week" className={LABEL_CLASS}>
            Which week?
          </label>
          <select
            id="quicklog-week"
            value={backfillWeek ?? ""}
            onChange={(e) => {
              setSuccess(null);
              setBackfillWeek(e.target.value === "" ? null : Number(e.target.value));
              setFieldErrors((prev) => ({ ...prev, weekIndex: undefined }));
            }}
            aria-invalid={Boolean(fieldErrors.weekIndex)}
            className={FIELD_CLASS}
          >
            {pastWeeks.map((week) => (
              <option key={week.index} value={week.index}>
                {weekName(week)} ({formatWeekRange(week)}) · {formatNumber(week.actual)} {unit} so
                far
              </option>
            ))}
          </select>
          {fieldErrors.weekIndex && <FieldError>{fieldErrors.weekIndex}</FieldError>}
        </div>
      )}

      <div>
        <label htmlFor="quicklog-amount" className={LABEL_CLASS}>
          Amount
        </label>
        <div className="relative">
          <input
            id="quicklog-amount"
            ref={amountRef}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSuccess(null);
              setFieldErrors((prev) => ({ ...prev, value: undefined }));
            }}
            placeholder="0"
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.value)}
            className={`${FIELD_CLASS} ${unit ? "pr-16" : ""}`}
          />
          {unit && (
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-gray-400">
              {unit}
            </span>
          )}
        </div>
        {fieldErrors.value && <FieldError>{fieldErrors.value}</FieldError>}
        <p className="mt-1.5 text-xs text-gray-400">
          {targetWeek
            ? `Added to ${weekName(targetWeek)} (${formatWeekRange(targetWeek)}).`
            : "Choose a week to log to."}
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-xl bg-brand px-5 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Logging…" : "Log it"}
      </button>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-sm text-red-600">{children}</p>;
}
