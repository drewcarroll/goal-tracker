"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { GoalDTO } from "@/application/dtos/GoalDTO";
import type {
  GoalActionResult,
  GoalFieldErrors,
  GoalFormValues,
} from "@/interfaces/web/app/(app)/goals/actions";

interface GoalFormProps {
  /** Provide an existing goal to edit; omit to create a new one. */
  goal?: GoalDTO;
  /** Submits the form values; bound by the parent to create or update. */
  onSubmit: (values: GoalFormValues) => Promise<GoalActionResult>;
  onSuccess: (goal: GoalDTO) => void;
  onCancel: () => void;
}

/** ISO timestamp -> "YYYY-MM-DD" for a native date input. */
function toDateInputValue(iso: string | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

const FIELD_CLASS =
  "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-base text-gray-900 " +
  "shadow-sm outline-none transition-colors placeholder:text-gray-400 " +
  "focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-60";

const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-gray-700";

export function GoalForm({ goal, onSubmit, onSuccess, onCancel }: GoalFormProps) {
  const isEdit = Boolean(goal);
  const [values, setValues] = useState<GoalFormValues>({
    name: goal?.name ?? "",
    targetValue: goal ? String(goal.targetValue) : "",
    unit: goal?.unit ?? "",
    startDate: toDateInputValue(goal?.startDate),
    endDate: toDateInputValue(goal?.endDate),
  });
  const [fieldErrors, setFieldErrors] = useState<GoalFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof GoalFormValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  /** Lightweight client-side checks so users get feedback before a round-trip. */
  function validate(): GoalFieldErrors {
    const errors: GoalFieldErrors = {};
    if (!values.name.trim()) errors.name = "Name is required";
    const target = Number(values.targetValue);
    if (!values.targetValue.trim() || Number.isNaN(target)) {
      errors.targetValue = "Target value must be a number";
    } else if (target <= 0) {
      errors.targetValue = "Target value must be greater than zero";
    }
    if (!values.unit.trim()) errors.unit = "Unit is required";
    if (!values.startDate) errors.startDate = "Start date is required";
    if (!values.endDate) errors.endDate = "End date is required";
    if (values.startDate && values.endDate && values.endDate <= values.startDate) {
      errors.endDate = "End date must be after the start date";
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

    startTransition(async () => {
      const result = await onSubmit(values);
      if (result.ok) {
        onSuccess(result.goal);
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
      <h2 className="text-lg font-semibold text-gray-900">
        {isEdit ? "Edit goal" : "New goal"}
      </h2>

      {formError && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {formError}
        </p>
      )}

      <div>
        <label htmlFor="goal-name" className={LABEL_CLASS}>
          Name
        </label>
        <input
          id="goal-name"
          type="text"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Read books"
          autoComplete="off"
          aria-invalid={Boolean(fieldErrors.name)}
          className={FIELD_CLASS}
        />
        {fieldErrors.name && <FieldError>{fieldErrors.name}</FieldError>}
      </div>

      {/* Target + unit sit side by side from the xs breakpoint up. */}
      <div className="flex flex-col gap-4 xs:flex-row">
        <div className="xs:flex-1">
          <label htmlFor="goal-target" className={LABEL_CLASS}>
            Target value
          </label>
          <input
            id="goal-target"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={values.targetValue}
            onChange={(e) => update("targetValue", e.target.value)}
            placeholder="12"
            aria-invalid={Boolean(fieldErrors.targetValue)}
            className={FIELD_CLASS}
          />
          {fieldErrors.targetValue && <FieldError>{fieldErrors.targetValue}</FieldError>}
        </div>

        <div className="xs:flex-1">
          <label htmlFor="goal-unit" className={LABEL_CLASS}>
            Unit
          </label>
          <input
            id="goal-unit"
            type="text"
            value={values.unit}
            onChange={(e) => update("unit", e.target.value)}
            placeholder="books"
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.unit)}
            className={FIELD_CLASS}
          />
          {fieldErrors.unit && <FieldError>{fieldErrors.unit}</FieldError>}
        </div>
      </div>

      <div className="flex flex-col gap-4 xs:flex-row">
        <div className="xs:flex-1">
          <label htmlFor="goal-start" className={LABEL_CLASS}>
            Start date
          </label>
          <input
            id="goal-start"
            type="date"
            value={values.startDate}
            onChange={(e) => update("startDate", e.target.value)}
            aria-invalid={Boolean(fieldErrors.startDate)}
            className={FIELD_CLASS}
          />
          {fieldErrors.startDate && <FieldError>{fieldErrors.startDate}</FieldError>}
        </div>

        <div className="xs:flex-1">
          <label htmlFor="goal-end" className={LABEL_CLASS}>
            End date
          </label>
          <input
            id="goal-end"
            type="date"
            value={values.endDate}
            min={values.startDate || undefined}
            onChange={(e) => update("endDate", e.target.value)}
            aria-invalid={Boolean(fieldErrors.endDate)}
            className={FIELD_CLASS}
          />
          {fieldErrors.endDate && <FieldError>{fieldErrors.endDate}</FieldError>}
        </div>
      </div>

      <div className="mt-1 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-xl border border-gray-300 px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60 sm:px-5 sm:text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60 sm:px-5 sm:text-sm"
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create goal"}
        </button>
      </div>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-sm text-red-600">{children}</p>;
}
