import type { Metadata } from "next";
import Link from "next/link";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { CheckInFlow } from "@/interfaces/web/components/checkin/CheckInFlow";

export const metadata: Metadata = { title: "Check in · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  const { getTodayPlanUseCase, getTodayCheckInUseCase, getAllGoalsUseCase, localDateService } =
    getContainer();
  const userId = currentUserId();
  const date = localDateService.today(currentTimezone());

  const [todayPlan, existingCheckIn, goals] = await Promise.all([
    getTodayPlanUseCase.execute({ userId, date }),
    getTodayCheckInUseCase.execute({ userId, date }),
    getAllGoalsUseCase.execute({ userId }),
  ]);

  if (!todayPlan) {
    return (
      <section className="mx-auto flex w-full max-w-md flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Check in</h1>
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-gray-600">Nothing was planned for today.</p>
          <Link
            href="/plan?for=today"
            className="mt-4 inline-block rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
          >
            Plan today
          </Link>
        </div>
      </section>
    );
  }

  const byId = new Map(goals.map((g) => [g.id, g]));
  const plannedGoals = todayPlan.goalIds
    .map((id) => byId.get(id))
    .filter((g): g is NonNullable<typeof g> => g !== undefined);

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Check in</h1>
        <p className="mt-1 text-gray-600">How did today go?</p>
      </div>
      <CheckInFlow goals={plannedGoals} existingCheckIn={existingCheckIn} />
    </section>
  );
}
