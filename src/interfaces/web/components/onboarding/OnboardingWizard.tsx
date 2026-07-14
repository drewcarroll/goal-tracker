"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GoalSuggestionDTO, GoalDifficulty } from "@/application/dtos/GoalDTO";
import { FrequencySlider } from "@/interfaces/web/components/goals/FrequencySlider";
import { createGoalsFromOnboardingAction } from "@/interfaces/web/app/onboarding/actions";

const DIFFICULTIES: { value: GoalDifficulty; label: string; classes: string }[] = [
  { value: "easy", label: "Easy", classes: "border-green-300 bg-green-50 text-green-800" },
  { value: "medium", label: "Medium", classes: "border-amber-300 bg-amber-50 text-amber-800" },
  { value: "hard", label: "Hard", classes: "border-orange-300 bg-orange-50 text-orange-800" },
];

type Step = 1 | 2 | 3;

export function OnboardingWizard({
  suggestions,
  alreadyTrackedNames,
}: {
  suggestions: GoalSuggestionDTO[];
  alreadyTrackedNames: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customInput, setCustomInput] = useState("");
  const [difficulties, setDifficulties] = useState<Record<string, GoalDifficulty>>({});
  const [frequencies, setFrequencies] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const alreadyTracked = useMemo(() => new Set(alreadyTrackedNames), [alreadyTrackedNames]);
  const suggestionLabels = useMemo(() => new Set(suggestions.map((s) => s.label)), [suggestions]);
  const selectedNames = [...selected];

  function toggle(label: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  function addCustom() {
    const name = customInput.trim();
    if (!name) return;
    setSelected((prev) => new Set(prev).add(name));
    setCustomInput("");
  }

  function removeCustom(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }

  function setDifficulty(name: string, difficulty: GoalDifficulty) {
    setDifficulties((prev) => ({ ...prev, [name]: difficulty }));
  }

  function setFrequency(name: string, target: number) {
    setFrequencies((prev) => ({ ...prev, [name]: target }));
  }

  function goToStep2() {
    if (selected.size === 0) {
      setError("Pick or add at least one goal to continue.");
      return;
    }
    setError(null);
    // Default every newly-selected goal so step 2 isn't a wall of unset
    // controls, while leaving prior choices untouched.
    setDifficulties((prev) => {
      const next = { ...prev };
      for (const name of selected) next[name] ??= "medium";
      return next;
    });
    setFrequencies((prev) => {
      const next = { ...prev };
      for (const name of selected) next[name] ??= 3;
      return next;
    });
    setStep(2);
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await createGoalsFromOnboardingAction(
        selectedNames.map((name) => ({
          name,
          difficulty: difficulties[name] ?? "medium",
          weeklyFrequencyTarget: frequencies[name] ?? 3,
        })),
      );
      if (result.ok) {
        router.push("/home");
      } else {
        setError(result.error);
      }
    });
  }

  const customSelected = selectedNames.filter((name) => !suggestionLabels.has(name));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-brand">Step {step} of 3</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
          {step === 1 && "What do you want to work on?"}
          {step === 2 && "How hard, and how often?"}
          {step === 3 && "Confirm your goals"}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {step === 1 && "Pick from the ideas below, or add your own."}
          {step === 2 &&
            "Harder goals start at a higher lock cost, so you naturally focus on fewer of them."}
          {step === 3 && "You can edit or pause these later from Goals."}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-6">
          <div>
            <label htmlFor="custom-goal" className="mb-1.5 block text-sm font-medium text-gray-700">
              Add your own
            </label>
            <div className="flex gap-2">
              <input
                id="custom-goal"
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom();
                  }
                }}
                placeholder="e.g. Call mom"
                maxLength={200}
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-base text-gray-900 shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
              <button
                type="button"
                onClick={addCustom}
                disabled={!customInput.trim()}
                className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {customSelected.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {customSelected.map((name) => (
                  <span
                    key={name}
                    className="flex items-center gap-1.5 rounded-full border border-brand bg-brand/5 px-2.5 py-1 text-xs font-medium text-brand"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removeCustom(name)}
                      aria-label={`Remove ${name}`}
                      className="text-brand/60 hover:text-brand"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {suggestions.map((entry) => {
              const tracked = alreadyTracked.has(entry.label.trim().toLowerCase());
              const checked = selected.has(entry.label);
              return (
                <label
                  key={entry.label}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
                    tracked
                      ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
                      : checked
                        ? "cursor-pointer border-brand bg-brand/5"
                        : "cursor-pointer border-gray-300 bg-white hover:bg-gray-50"
                  }`}
                >
                  <span className="min-w-0 truncate text-base font-medium text-gray-900">
                    {entry.label}
                  </span>
                  {tracked ? (
                    <span className="shrink-0 text-xs font-medium text-gray-400">
                      Already tracking
                    </span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(entry.label)}
                      className="h-5 w-5 shrink-0 accent-brand"
                    />
                  )}
                </label>
              );
            })}
          </div>

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
            {selectedNames.map((name) => (
              <div key={name} className="rounded-xl border border-gray-900/[0.06] bg-white p-4 shadow-sm">
                <p className="mb-2.5 truncate text-base font-medium text-gray-900">{name}</p>
                <p className="mb-1.5 text-sm font-medium text-gray-700">
                  How hard do you think this will be to accomplish?
                </p>
                <div className="mb-3 flex gap-2">
                  {DIFFICULTIES.map((d) => {
                    const active = (difficulties[name] ?? "medium") === d.value;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDifficulty(name, d.value)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                          active ? d.classes : "border-gray-900/[0.06] bg-white text-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                <FrequencySlider
                  value={frequencies[name] ?? 3}
                  onChange={(value) => setFrequency(name, value)}
                />
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
          <div className="flex flex-col gap-2 rounded-xl border border-gray-900/[0.06] bg-white p-4 shadow-sm">
            {selectedNames.map((name) => {
              const difficulty = difficulties[name] ?? "medium";
              const d = DIFFICULTIES.find((x) => x.value === difficulty)!;
              return (
                <div
                  key={name}
                  className="flex items-center justify-between gap-3 border-b border-gray-100 py-2 last:border-0"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {name}
                    <span className="ml-2 font-normal text-gray-400">
                      {frequencies[name] ?? 3}x/week
                    </span>
                  </span>
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
              {pending ? "Creating…" : "Create goals"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
