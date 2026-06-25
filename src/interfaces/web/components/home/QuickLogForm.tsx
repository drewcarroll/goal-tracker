"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import type { GoalDTO } from "@/application/dtos/GoalDTO";
import {
  logProgressAction,
  type QuickLogFieldErrors,
  type QuickLogFormValues,
} from "@/interfaces/web/app/(app)/home/actions";

/** Renders a number without noise: integers as-is, otherwise up to 2 decimals. */
function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
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
}

export function QuickLogForm({ goals }: { goals: GoalDTO[] }) {
  const [selectedId, setSelectedId] = useState<string>(goals[0]?.id ?? "");
  const [value, setValue] = useState("");
  const [fieldErrors, setFieldErrors] = useState<QuickLogFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<LogSuccess | null>(null);
  const [pending, startTransition] = useTransition();
  const amountRef = useRef<HTMLInputElement>(null);

  const selectedGoal = goals.find((g) => g.id === selectedId);
  const unit = selectedGoal?.unit ?? "";

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

    const payload: QuickLogFormValues = { goalId: selectedId, value };
    startTransition(async () => {
      const result = await logProgressAction(payload);
      if (result.ok) {
        setSuccess({
          goalName: result.goal.name,
          value: result.log.value,
          unit: result.goal.unit,
          weekTotal: result.weekTotal,
        });
        // Keep the goal selected and clear the amount so repeat logging is fast.
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
          to <span className="font-semibold text-gray-900">{success.goalName}</span>. This week:{" "}
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
        <p className="mt-1.5 text-xs text-gray-400">Added to this week.</p>
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
