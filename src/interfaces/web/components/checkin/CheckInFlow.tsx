"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GoalDTO } from "@/application/dtos/GoalDTO";
import type { CheckInDTO } from "@/application/dtos/CheckInDTO";
import type { ClaimBattlePassDayResultDTO } from "@/application/dtos/BattlePassDTO";
import { RankBadge } from "@/interfaces/web/components/profile/RankBadge";
import { rankVisual } from "@/interfaces/web/components/profile/rankColors";
import { LockIcon, CoinIcon } from "@/interfaces/web/components/icons";
import { submitCheckInAction, saveJournalAction } from "@/interfaces/web/app/(app)/checkin/actions";

type Step = "marks" | "confirm" | "celebrate" | "battlePassClaim" | "journal";

type RankReward = {
  xpEarned: number;
  xp: number;
  rank: number;
  nextRank: number;
  xpIntoRank: number;
  xpForRankUp: number;
  rankedUp: boolean;
};

export function CheckInFlow({
  goals,
  existingCheckIn,
}: {
  goals: GoalDTO[];
  existingCheckIn: CheckInDTO | null;
}) {
  if (existingCheckIn) {
    return <AlreadyCheckedIn goals={goals} checkIn={existingCheckIn} />;
  }
  return <CheckInWizard goals={goals} />;
}

function AlreadyCheckedIn({ goals, checkIn }: { goals: GoalDTO[]; checkIn: CheckInDTO }) {
  const byId = new Map(goals.map((g) => [g.id, g]));
  const passed = checkIn.dayResult === "PASS";
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-900/[0.06] bg-white p-5 shadow-sm sm:p-6">
      <p
        className={`text-base font-medium ${passed ? "text-emerald-700" : "text-gray-700"}`}
      >
        {passed ? "Nice, you passed today." : "Checked in. One or more goals were missed today."}
      </p>
      <ul className="flex flex-col gap-2">
        {checkIn.marks.map((mark) => {
          const goal = byId.get(mark.goalId);
          return (
            <li
              key={mark.goalId}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm"
            >
              <span className="font-medium text-gray-900">{goal?.name ?? "Goal"}</span>
              <span className={mark.passed ? "text-emerald-600" : "text-gray-400"}>
                {mark.passed ? "✓ Passed" : "✗ Missed"}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-gray-500">
        If it wasn&apos;t truthful, come back tomorrow. A missed day never erases your progress.
      </p>
    </div>
  );
}

function CheckInWizard({ goals }: { goals: GoalDTO[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("marks");
  const [marks, setMarks] = useState<Record<string, boolean | null>>(
    Object.fromEntries(goals.map((g) => [g.id, null])),
  );
  const [text, setText] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [reward, setReward] = useState<RankReward | null>(null);
  const [battlePassClaim, setBattlePassClaim] = useState<ClaimBattlePassDayResultDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allMarked = goals.every((g) => marks[g.id] !== null);

  function setMark(goalId: string, passed: boolean) {
    setMarks((prev) => ({ ...prev, [goalId]: passed }));
  }

  function handleSubmitMarks() {
    setStep("confirm");
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await submitCheckInAction(
        goals.map((g) => ({ goalId: g.id, passed: marks[g.id]! })),
      );
      if (result.ok) {
        setReward(result.rank);
        setBattlePassClaim(result.battlePassClaim);
        setStep("celebrate");
      } else {
        setError(result.error);
        setStep("marks");
      }
    });
  }

  function finish() {
    startTransition(async () => {
      const trimmed = text.trim();
      if (trimmed || mood !== null) {
        await saveJournalAction(trimmed || undefined, mood ?? undefined);
      }
      router.push("/home");
    });
  }

  if (step === "marks") {
    return (
      <div className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-900/[0.06] bg-white p-4 shadow-sm"
            >
              <span className="truncate font-medium text-gray-900">{goal.name}</span>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setMark(goal.id, true)}
                  aria-pressed={marks[goal.id] === true}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-lg font-bold transition-colors ${
                    marks[goal.id] === true
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-gray-300 bg-white text-gray-400 hover:border-emerald-400"
                  }`}
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => setMark(goal.id, false)}
                  aria-pressed={marks[goal.id] === false}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-lg font-bold transition-colors ${
                    marks[goal.id] === false
                      ? "border-red-500 bg-red-500 text-white"
                      : "border-gray-300 bg-white text-gray-400 hover:border-red-400"
                  }`}
                >
                  ✗
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleSubmitMarks}
          disabled={!allMarked}
          className="mt-1 rounded-xl bg-brand px-5 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          Continue
        </button>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-heading"
        className="flex flex-col gap-4 rounded-2xl border border-gray-900/[0.06] bg-white p-6 shadow-sm"
      >
        <h2 id="confirm-heading" className="text-lg font-semibold text-gray-900">
          Going to sleep? Is this truthful?
        </h2>
        <p className="text-sm text-gray-600">
          If it&apos;s not, you&apos;re only hurting yourself. And if you missed a goal, you
          won&apos;t lose all your progress. A miss just makes that goal a little more expensive
          tomorrow, nothing more.
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setStep("marks")}
            disabled={pending}
            className="rounded-xl border border-gray-300 px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60 sm:px-5 sm:text-sm"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60 sm:px-5 sm:text-sm"
          >
            {pending ? (
              "Submitting…"
            ) : (
              <>
                Submit
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                  +500 XP
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (step === "celebrate" && reward) {
    const visual = rankVisual(reward.rank);
    const progressPct = Math.round(Math.min(1, reward.xpIntoRank / reward.xpForRankUp) * 100);
    return (
      <div className="flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-gray-900/[0.06] bg-white p-8 text-center shadow-sm">
        <div className="animate-pop-in">
          <RankBadge rank={reward.rank} size="lg" />
        </div>
        {reward.rankedUp ? (
          <div className="animate-rise-in">
            <p
              className="text-xs font-bold uppercase tracking-[0.2em]"
              style={{ color: visual.color }}
            >
              Rank up
            </p>
            <h2 className="mt-1 text-2xl font-bold" style={{ color: visual.color }}>
              Rank {reward.rank}
            </h2>
          </div>
        ) : (
          <h2 className="animate-rise-in text-2xl font-bold text-gray-900">
            +{reward.xpEarned.toLocaleString()} XP
          </h2>
        )}

        <div className="animate-rise-in-late w-full">
          <div className="flex items-center gap-2.5">
            <RankBadge rank={reward.rank} />
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progressPct}%`,
                  background: `linear-gradient(90deg, ${visual.from}, ${rankVisual(reward.nextRank).to})`,
                }}
              />
            </div>
            <RankBadge rank={reward.nextRank} />
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            {(reward.xpForRankUp - reward.xpIntoRank).toLocaleString()} XP to Rank{" "}
            {reward.nextRank}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setStep(battlePassClaim ? "battlePassClaim" : "journal")}
          className="mt-1 w-full rounded-xl bg-brand px-5 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark active:scale-[0.98] sm:w-auto sm:px-8"
        >
          Continue
        </button>
      </div>
    );
  }

  if (step === "battlePassClaim" && battlePassClaim) {
    return (
      <div className="flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-gray-900/[0.06] bg-white p-8 text-center shadow-sm">
        <div className="animate-pop-in text-6xl leading-none">
          {battlePassClaim.kind === "trinket" ? battlePassClaim.trinket.emoji : "🪙"}
        </div>
        <div className="animate-rise-in">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">
            Battle pass
          </p>
          {battlePassClaim.kind === "trinket" ? (
            <>
              <h2 className="mt-1 text-2xl font-bold text-gray-900">{battlePassClaim.trinket.name}</h2>
              {battlePassClaim.quantity > 1 && (
                <p className="mt-1 text-sm text-gray-500">×{battlePassClaim.quantity} owned</p>
              )}
            </>
          ) : (
            <h2 className="mt-1 inline-flex items-center gap-1.5 text-2xl font-bold text-gray-900">
              <CoinIcon className="h-6 w-6 text-amber-500" />+
              {battlePassClaim.coinAmount.toLocaleString()}
            </h2>
          )}
        </div>
        <button
          type="button"
          onClick={() => setStep("journal")}
          className="mt-1 w-full rounded-xl bg-brand px-5 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark active:scale-[0.98] sm:w-auto sm:px-8"
        >
          Continue
        </button>
      </div>
    );
  }

  // step === "journal"
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-900/[0.06] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <LockIcon className="h-5 w-5 text-brand" />
        <h2 className="text-lg font-semibold text-gray-900">Private journal</h2>
      </div>
      <p className="text-sm text-gray-600">
        Nobody can see this, not even by accident. Totally optional.
      </p>

      <div>
        <label htmlFor="journal-text" className="mb-1.5 block text-sm font-medium text-gray-700">
          A sentence or two about today
        </label>
        <textarea
          id="journal-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="Optional"
          className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-base text-gray-900 shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-700">Mood</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMood(mood === value ? null : value)}
              aria-pressed={mood === value}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-colors ${
                mood === value
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-gray-900/[0.06] bg-white text-gray-400 hover:bg-gray-50"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-1 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={finish}
          disabled={pending}
          className="rounded-xl border border-gray-300 px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60 sm:px-5 sm:text-sm"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={finish}
          disabled={pending}
          className="rounded-xl bg-brand px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60 sm:px-5 sm:text-sm"
        >
          {pending ? "Saving…" : "Finish"}
        </button>
      </div>
    </div>
  );
}
