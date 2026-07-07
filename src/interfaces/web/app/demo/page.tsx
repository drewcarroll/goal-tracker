// Dev-only demo route — renders the progress charts with mock data so they can
// be viewed locally without a database, Supabase, or Google sign-in.
//
// Guarded to development: it 404s under `next start`/production builds, so it is
// safe to keep in the repo. Reachable without auth (see middleware PUBLIC_PREFIXES).
import { notFound } from "next/navigation";
import type { ProgressChartDTO, ProgressWeekPointDTO } from "@/application/dtos/ProgressDTO";
import type { WeekKindDTO } from "@/application/dtos/GoalDTO";
import { ProgressView } from "@/interfaces/web/components/progress/ProgressView";

export const dynamic = "force-dynamic";

/** Build a chart DTO the same shape the real aggregation use case produces. */
function buildChart(params: {
  goalId: string;
  goalName: string;
  unit: string;
  weeklyTarget: number;
  totalWeeks: number;
  currentWeekIndex: number;
  actuals: number[]; // logged amount per elapsed week
}): ProgressChartDTO {
  const { goalId, goalName, unit, weeklyTarget, totalWeeks, currentWeekIndex, actuals } = params;
  let cumActual = 0;
  let cumProjected = 0;
  const weeks: ProgressWeekPointDTO[] = Array.from({ length: totalWeeks }, (_, i) => {
    const kind: WeekKindDTO =
      i < currentWeekIndex ? "past" : i === currentWeekIndex ? "current" : "future";
    const weeklyActual = kind === "future" ? 0 : (actuals[i] ?? 0);
    const contribution = kind === "past" ? weeklyActual : Math.max(weeklyTarget, weeklyActual);
    cumProjected += contribution;
    if (kind !== "future") cumActual += weeklyActual;
    return {
      index: i,
      startDate: new Date(2026, 0, 1 + i * 7).toISOString(),
      endDate: new Date(2026, 0, 8 + i * 7).toISOString(),
      kind,
      weeklyActual,
      weeklyTarget,
      cumulativeTarget: weeklyTarget * (i + 1),
      cumulativeActual: kind === "future" ? null : cumActual,
      cumulativeProjected: cumProjected,
    };
  });
  return {
    goalId,
    goalName,
    unit,
    targetValue: weeklyTarget * totalWeeks,
    weeklyTarget,
    totalWeeks,
    currentWeekIndex,
    projectedTotal: cumProjected,
    startDate: weeks[0]!.startDate,
    endDate: weeks[weeks.length - 1]!.endDate,
    weeks,
  };
}

export default function DemoPage() {
  // Never expose the demo (or its mock data) outside local development.
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const charts: ProgressChartDTO[] = [
    buildChart({
      goalId: "demo-books",
      goalName: "Read books",
      unit: "books",
      weeklyTarget: 10,
      totalWeeks: 5,
      currentWeekIndex: 2,
      actuals: [6, 8, 4],
    }),
    buildChart({
      goalId: "demo-run",
      goalName: "Run distance",
      unit: "km",
      weeklyTarget: 12,
      totalWeeks: 16,
      currentWeekIndex: 6,
      actuals: [14, 9, 12, 18, 7, 11, 5],
    }),
    buildChart({
      goalId: "demo-sprint",
      goalName: "Sprint points",
      unit: "pts",
      weeklyTarget: 8,
      totalWeeks: 2,
      currentWeekIndex: 1,
      actuals: [10, 3],
    }),
  ];

  return (
    <main className="min-h-dvh bg-gray-50 px-4 py-6">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            Demo · mock data · no sign-in
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
          <p className="mt-1 text-gray-600">
            Three goals with different timeframes (5, 16, and 2 weeks).
          </p>
        </div>
        <ProgressView
          charts={charts}
          habitStats={[]}
          checkIns={[]}
          today={new Date().toISOString().slice(0, 10)}
        />
      </section>
    </main>
  );
}
