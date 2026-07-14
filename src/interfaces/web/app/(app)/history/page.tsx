import type { Metadata } from "next";
import Link from "next/link";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { CheckInHistoryView } from "@/interfaces/web/components/history/CheckInHistoryView";

export const metadata: Metadata = { title: "History · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const { getCheckInHistoryUseCase, getAllGoalsUseCase, localDateService } = getContainer();
  const userId = currentUserId();
  const today = localDateService.today(currentTimezone());

  const [checkIns, goals] = await Promise.all([
    getCheckInHistoryUseCase.execute({ userId }),
    getAllGoalsUseCase.execute({ userId }),
  ]);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">History</h1>
          <p className="mt-1 text-gray-600">Review and correct past check-ins.</p>
        </div>
        <Link href="/journal" className="text-sm font-medium text-brand hover:underline">
          🔒 Journal →
        </Link>
      </div>

      {goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-gray-600">No goals yet, so nothing to look back on.</p>
          <Link
            href="/goals"
            className="mt-4 inline-block rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
          >
            Set up goals
          </Link>
        </div>
      ) : (
        <CheckInHistoryView checkIns={checkIns} goals={goals} today={today} />
      )}
    </section>
  );
}
