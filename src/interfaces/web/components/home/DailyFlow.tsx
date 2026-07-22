"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GoalDTO } from "@/application/dtos/GoalDTO";
import type { CheckInDTO } from "@/application/dtos/CheckInDTO";
import { DAILY_LOCK_BUDGET, type DailyPlanDTO } from "@/application/dtos/DailyPlanDTO";
import type { ClaimBattlePassDayResultDTO } from "@/application/dtos/BattlePassDTO";
import type { WeeklyGoalStatusDTO } from "@/application/use-cases/GetWeeklyScheduleStatusUseCase";
import { RankBadge } from "@/interfaces/web/components/profile/RankBadge";
import { rankVisual } from "@/interfaces/web/components/profile/rankColors";
import { SwipeableGoalRow } from "@/interfaces/web/components/home/SwipeableGoalRow";
import { LockIcon, CoinIcon, MoonIcon } from "@/interfaces/web/components/icons";
import { submitCheckInAction, saveJournalAction } from "@/interfaces/web/app/(app)/checkin/actions";
import { createDailyPlanAction } from "@/interfaces/web/app/(app)/plan/actions";

export type RewardPreview =
  | { kind: "coins"; coinAmount: number }
  | { kind: "trinket"; trinketEmoji: string; trinketName: string };

type Step = "list" | "confirm" | "celebrate" | "battlePassClaim" | "journal" | "scheduleTomorrow" | "done";

type RankReward = {
  xpEarned: number;
  xp: number;
  rank: number;
  nextRank: number;
  xpIntoRank: number;
  xpForRankUp: number;
  rankedUp: boolean;
};

/** "14:00" → "2:00 PM". */
function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h! >= 12 ? "PM" : "AM";
  const hour12 = h! % 12 === 0 ? 12 : h! % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function DailyFlow({
  goals,
  plannedGoals,
  hasTodayPlan,
  existingCheckIn,
  windowOpen,
  opensAtRaw,
  todayRewardPreview,
  tomorrowPlan,
  weeklyStatus,
}: {
  goals: GoalDTO[];
  plannedGoals: GoalDTO[];
  hasTodayPlan: boolean;
  existingCheckIn: CheckInDTO | null;
  windowOpen: boolean;
  opensAtRaw: string | null;
  todayRewardPreview: RewardPreview | null;
  tomorrowPlan: DailyPlanDTO | null;
  weeklyStatus: WeeklyGoalStatusDTO[];
}) {
  // Frozen at first mount, not the live prop: submitCheckInAction revalidates
  // "/home" as part of its own submission, which would otherwise re-render
  // this Server Component subtree mid-wizard and yank the UI straight to the
  // "already logged" resting state before the user ever saw the celebration/
  // battle-pass-claim/journal/schedule-tomorrow steps (real bug, caught live
  // 2026-07-18). Once the wizard reaches its own "done" step, that IS the
  // resting state for this page load — a fresh mount (real page reload)
  // reads the prop fresh, which is when this should actually flip.
  const [hadCheckInAtMount] = useState(existingCheckIn !== null);

  if (goals.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-center">
        <p className="text-gray-600">No goals yet. Let&apos;s set some up.</p>
        <Link
          href="/goals"
          className="mt-3 inline-block rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          Set up goals
        </Link>
      </section>
    );
  }

  if (!hasTodayPlan) {
    return (
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
        <h2 className="font-display text-lg font-semibold text-gray-900">Today isn&apos;t planned</h2>
        <p className="mt-1 text-sm text-gray-700">
          If you missed planning last night, that&apos;s okay. Plan now instead.
        </p>
        <Link
          href="/plan?for=today"
          className="mt-3 inline-block rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          Schedule today
        </Link>
      </section>
    );
  }

  if (hadCheckInAtMount) {
    return <LoggedResting tomorrowPlan={tomorrowPlan} />;
  }

  return (
    <DailyWizard
      plannedGoals={plannedGoals}
      goals={goals}
      windowOpen={windowOpen}
      opensAtRaw={opensAtRaw}
      todayRewardPreview={todayRewardPreview}
      tomorrowPlan={tomorrowPlan}
      weeklyStatus={weeklyStatus}
    />
  );
}

/** Already logged today — a resting state, plus a nudge to plan tomorrow if that's still open. */
function LoggedResting({ tomorrowPlan }: { tomorrowPlan: DailyPlanDTO | null }) {
  return (
    <section className="flex flex-col gap-3">
      <p className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">
        Day logged. See you tomorrow.
      </p>
      {!tomorrowPlan && (
        <Link
          href="/plan"
          className="self-start text-sm font-medium text-brand hover:underline"
        >
          Schedule tomorrow →
        </Link>
      )}
    </section>
  );
}

function DailyWizard({
  plannedGoals,
  goals,
  windowOpen,
  opensAtRaw,
  todayRewardPreview,
  tomorrowPlan,
  weeklyStatus,
}: {
  plannedGoals: GoalDTO[];
  goals: GoalDTO[];
  windowOpen: boolean;
  opensAtRaw: string | null;
  todayRewardPreview: RewardPreview | null;
  tomorrowPlan: DailyPlanDTO | null;
  weeklyStatus: WeeklyGoalStatusDTO[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("list");
  const [showTimeGate, setShowTimeGate] = useState(false);
  const [marks, setMarks] = useState<Record<string, boolean | null>>(
    Object.fromEntries(plannedGoals.map((g) => [g.id, null])),
  );
  const [text, setText] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [reward, setReward] = useState<RankReward | null>(null);
  const [battlePassClaim, setBattlePassClaim] = useState<ClaimBattlePassDayResultDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allMarked = plannedGoals.every((g) => marks[g.id] !== null);

  function setMark(goalId: string, passed: boolean) {
    setMarks((prev) => ({ ...prev, [goalId]: passed }));
  }

  function tapFinishDay() {
    if (!windowOpen) {
      setShowTimeGate(true);
      return;
    }
    setStep("confirm");
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await submitCheckInAction(
        plannedGoals.map((g) => ({ goalId: g.id, passed: marks[g.id]! })),
      );
      if (result.ok) {
        setReward(result.rank);
        setBattlePassClaim(result.battlePassClaim);
        setStep("celebrate");
      } else {
        setError(result.error);
        setStep("list");
      }
    });
  }

  function afterJournal() {
    startTransition(async () => {
      const trimmed = text.trim();
      if (trimmed || mood !== null) {
        await saveJournalAction(trimmed || undefined, mood ?? undefined);
      }
      setStep(tomorrowPlan ? "done" : "scheduleTomorrow");
      if (tomorrowPlan) router.refresh();
    });
  }

  if (step === "list") {
    return (
      <section aria-labelledby="today-goals-heading" className="flex flex-col gap-3">
        <h2 id="today-goals-heading" className="font-display text-lg font-semibold text-gray-900">
          Today&apos;s Goals
        </h2>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {plannedGoals.map((goal) => (
            <li key={goal.id}>
              <SwipeableGoalRow
                name={goal.name}
                passed={marks[goal.id] ?? null}
                onMark={(p) => setMark(goal.id, p)}
              />
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={tapFinishDay}
          disabled={!allMarked}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-center text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark active:scale-[0.98] disabled:opacity-60"
        >
          <MoonIcon className="h-5 w-5" />
          Finish Day
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">+500 XP</span>
          {todayRewardPreview && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
              {todayRewardPreview.kind === "coins" ? (
                <>
                  <CoinIcon className="h-3.5 w-3.5" />+{todayRewardPreview.coinAmount}
                </>
              ) : (
                <>+{todayRewardPreview.trinketEmoji}</>
              )}
            </span>
          )}
        </button>

        {!tomorrowPlan && (
          <Link href="/plan" className="self-center text-sm font-medium text-brand hover:underline">
            Schedule tomorrow →
          </Link>
        )}

        <Link href="/trinkets" className="self-center text-sm font-medium text-brand hover:underline">
          View rewards calendar
        </Link>

        {showTimeGate && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowTimeGate(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-display text-lg font-bold text-gray-900">Not open yet</p>
              <p className="mt-2 text-sm text-gray-600">
                Available starting at {opensAtRaw ? formatTime(opensAtRaw) : "later today"}! You can
                change this in Settings.
              </p>
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowTimeGate(false)}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Got it
                </button>
                <Link
                  href="/profile"
                  className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
                >
                  Settings
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>
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
        <h2 id="confirm-heading" className="font-display text-lg font-semibold text-gray-900">
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
            onClick={() => setStep("list")}
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
            {pending ? "Submitting…" : (
              <>
                Submit
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">+500 XP</span>
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
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: visual.color }}>
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
            {(reward.xpForRankUp - reward.xpIntoRank).toLocaleString()} XP to Rank {reward.nextRank}
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
        <div className="animate-pop-in flex h-16 items-center justify-center text-6xl leading-none">
          {battlePassClaim.kind === "trinket" ? battlePassClaim.trinket.emoji : <CoinIcon className="h-16 w-16 text-amber-500" />}
        </div>
        <div className="animate-rise-in">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">Battle pass</p>
          {battlePassClaim.kind === "trinket" ? (
            <>
              <h2 className="mt-1 text-2xl font-bold text-gray-900">{battlePassClaim.trinket.name}</h2>
              {battlePassClaim.quantity > 1 && (
                <p className="mt-1 text-sm text-gray-500">×{battlePassClaim.quantity} owned</p>
              )}
            </>
          ) : (
            <h2 className="mt-1 inline-flex items-center gap-1.5 text-2xl font-bold text-gray-900">
              <CoinIcon className="h-6 w-6 text-amber-500" />+{battlePassClaim.coinAmount.toLocaleString()}
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

  if (step === "journal") {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-900/[0.06] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <LockIcon className="h-5 w-5 text-brand" />
          <h2 className="font-display text-lg font-semibold text-gray-900">Private journal</h2>
        </div>
        <p className="text-sm text-gray-600">Nobody can see this, not even by accident. Totally optional.</p>

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
            onClick={afterJournal}
            disabled={pending}
            className="rounded-xl border border-gray-300 px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60 sm:px-5 sm:text-sm"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={afterJournal}
            disabled={pending}
            className="rounded-xl bg-brand px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60 sm:px-5 sm:text-sm"
          >
            {pending ? "Saving…" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "scheduleTomorrow") {
    return (
      <TomorrowPicker
        goals={goals}
        weeklyStatus={weeklyStatus}
        onDone={() => {
          setStep("done");
          router.refresh();
        }}
      />
    );
  }

  // step === "done"
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-900/[0.06] bg-white p-8 text-center shadow-sm">
      <p className="font-display text-lg font-bold text-gray-900">All set for tomorrow.</p>
      <p className="text-sm text-gray-500">See you at check-in.</p>
    </div>
  );
}

function TomorrowPicker({
  goals,
  weeklyStatus,
  onDone,
}: {
  goals: GoalDTO[];
  weeklyStatus: WeeklyGoalStatusDTO[];
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const statusByGoal = new Map(weeklyStatus.map((s) => [s.goalId, s]));
  const byId = new Map(goals.map((g) => [g.id, g]));
  const selectedKeys = Array.from(selected).reduce(
    (sum, goalId) => sum + (byId.get(goalId)?.currentLockCost ?? 0),
    0,
  );
  const overBudget = selectedKeys > DAILY_LOCK_BUDGET;

  function toggle(goalId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) next.delete(goalId);
      else next.add(goalId);
      return next;
    });
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createDailyPlanAction(Array.from(selected), "tomorrow");
      if (result.ok) {
        onDone();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-900/[0.06] bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-lg font-semibold text-gray-900">Schedule tomorrow</h2>
      <p className="-mt-2 text-sm text-gray-600">Pick what you&apos;ll attempt.</p>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {goals.map((goal) => {
          const checked = selected.has(goal.id);
          const status = statusByGoal.get(goal.id);
          const behindTarget = status && !status.onTrack && !checked;
          return (
            <label key={goal.id} className="flex flex-col gap-1">
              <span
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  checked ? "border-brand bg-brand/5" : "border-gray-300 bg-white hover:bg-gray-50"
                }`}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-base font-medium text-gray-900">{goal.name}</span>
                  <span className="text-xs text-gray-500">{goal.currentLockCost} keys</span>
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(goal.id)}
                  className="h-5 w-5 shrink-0 accent-brand"
                />
              </span>
              {behindTarget && (
                <span className="px-1 text-xs text-amber-600">
                  Won&apos;t hit its {status.weeklyFrequencyTarget}×/week target unless scheduled soon.
                </span>
              )}
            </label>
          );
        })}
      </div>

      <div
        className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-semibold ${
          overBudget
            ? "border-red-300 bg-red-50 text-red-700"
            : "border-gray-900/[0.06] bg-white text-gray-700"
        }`}
      >
        <span>Keys for tomorrow</span>
        <span>
          {selectedKeys} / {DAILY_LOCK_BUDGET}
        </span>
      </div>
      {overBudget && (
        <p role="alert" className="-mt-2 text-xs text-red-600">
          Over the daily key budget. Unschedule something to make room.
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending || selected.size === 0 || overBudget}
        className="mt-1 rounded-xl bg-brand px-5 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : `Schedule tomorrow (${selected.size})`}
      </button>
      <button type="button" onClick={onDone} className="text-sm font-medium text-gray-400 hover:underline">
        Skip for now
      </button>
    </div>
  );
}
