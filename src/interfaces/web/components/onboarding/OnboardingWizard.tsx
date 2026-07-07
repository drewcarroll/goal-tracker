"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { HabitCatalogEntryDTO, HabitDifficulty } from "@/application/dtos/HabitDTO";
import { createHabitsFromOnboardingAction } from "@/interfaces/web/app/onboarding/actions";

const CATEGORY_LABELS: Record<HabitCatalogEntryDTO["category"], string> = {
  physical: "Physical",
  addiction: "Addiction",
  mind: "Mind",
  skills: "Skills",
  misc: "Misc",
};

const CATEGORY_ORDER: HabitCatalogEntryDTO["category"][] = [
  "physical",
  "addiction",
  "mind",
  "skills",
  "misc",
];

const DIFFICULTIES: { value: HabitDifficulty; label: string; classes: string }[] = [
  { value: "easy", label: "Easy", classes: "border-green-300 bg-green-50 text-green-800" },
  { value: "medium", label: "Medium", classes: "border-amber-300 bg-amber-50 text-amber-800" },
  { value: "hard", label: "Hard", classes: "border-orange-300 bg-orange-50 text-orange-800" },
];

type Step = 1 | 2 | 3;

export function OnboardingWizard({
  catalog,
  alreadyTrackedCatalogIds,
}: {
  catalog: HabitCatalogEntryDTO[];
  alreadyTrackedCatalogIds: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [difficulties, setDifficulties] = useState<Record<string, HabitDifficulty>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const alreadyTracked = useMemo(
    () => new Set(alreadyTrackedCatalogIds),
    [alreadyTrackedCatalogIds],
  );
  const byCategory = useMemo(() => {
    const groups = new Map<string, HabitCatalogEntryDTO[]>();
    for (const entry of catalog) {
      const list = groups.get(entry.category) ?? [];
      list.push(entry);
      groups.set(entry.category, list);
    }
    return groups;
  }, [catalog]);
  const selectedEntries = catalog.filter((entry) => selected.has(entry.id));

  function toggle(catalogId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(catalogId)) {
        next.delete(catalogId);
      } else {
        next.add(catalogId);
      }
      return next;
    });
  }

  function setDifficulty(catalogId: string, difficulty: HabitDifficulty) {
    setDifficulties((prev) => ({ ...prev, [catalogId]: difficulty }));
  }

  function goToStep2() {
    if (selected.size === 0) {
      setError("Pick at least one habit to continue.");
      return;
    }
    setError(null);
    // Default every newly-selected habit to medium so step 2 isn't a wall of
    // unset chips, while leaving prior choices untouched.
    setDifficulties((prev) => {
      const next = { ...prev };
      for (const catalogId of selected) {
        next[catalogId] ??= "medium";
      }
      return next;
    });
    setStep(2);
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await createHabitsFromOnboardingAction(
        selectedEntries.map((entry) => ({
          catalogId: entry.id,
          difficulty: difficulties[entry.id] ?? "medium",
        })),
      );
      if (result.ok) {
        router.push("/home");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-brand">Step {step} of 3</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
          {step === 1 && "Which habits do you want to build?"}
          {step === 2 && "How hard is each one, right now?"}
          {step === 3 && "Confirm your habits"}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {step === 1 && "Pick the ones you don't already do consistently."}
          {step === 2 &&
            "Harder habits start at a higher lock cost, so you naturally focus on fewer of them."}
          {step === 3 && "You can pause or adjust these later from Settings."}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-6">
          {CATEGORY_ORDER.filter((category) => byCategory.has(category)).map((category) => (
            <div key={category}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                {CATEGORY_LABELS[category]}
              </h2>
              <div className="flex flex-col gap-2">
                {byCategory.get(category)!.map((entry) => {
                  const tracked = alreadyTracked.has(entry.id);
                  const checked = selected.has(entry.id);
                  return (
                    <label
                      key={entry.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
                        tracked
                          ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
                          : checked
                            ? "cursor-pointer border-brand bg-brand/5"
                            : "cursor-pointer border-gray-300 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex flex-col">
                        <span className="text-base font-medium text-gray-900">
                          {entry.label}
                        </span>
                        {entry.type === "timed" && (
                          <span className="text-xs text-gray-500">
                            One {entry.minMinutes}min+ session counts — no extra credit for longer.
                          </span>
                        )}
                      </span>
                      {tracked ? (
                        <span className="shrink-0 text-xs font-medium text-gray-400">
                          Already tracking
                        </span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(entry.id)}
                          className="h-5 w-5 shrink-0 accent-brand"
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={goToStep2}
            className="mt-2 rounded-xl bg-brand px-5 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
          >
            Next ({selected.size} selected)
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {selectedEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <p className="mb-2.5 text-base font-medium text-gray-900">{entry.label}</p>
                <div className="flex gap-2">
                  {DIFFICULTIES.map((d) => {
                    const active = (difficulties[entry.id] ?? "medium") === d.value;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDifficulty(entry.id, d.value)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                          active ? d.classes : "border-gray-200 bg-white text-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-xl border border-gray-300 px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 sm:px-5 sm:text-sm"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-xl bg-brand px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark sm:px-5 sm:text-sm"
            >
              Review
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            {selectedEntries.map((entry) => {
              const difficulty = difficulties[entry.id] ?? "medium";
              const d = DIFFICULTIES.find((x) => x.value === difficulty)!;
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 border-b border-gray-100 py-2 last:border-0"
                >
                  <span className="text-sm font-medium text-gray-900">{entry.label}</span>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${d.classes}`}
                  >
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={pending}
              className="rounded-xl border border-gray-300 px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60 sm:px-5 sm:text-sm"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className="rounded-xl bg-brand px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60 sm:px-5 sm:text-sm"
            >
              {pending ? "Creating…" : "Create habits"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
