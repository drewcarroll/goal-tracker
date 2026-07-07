import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { HistoryView } from "@/interfaces/web/components/history/HistoryView";
import { CheckInHistoryView } from "@/interfaces/web/components/history/CheckInHistoryView";

export const metadata: Metadata = { title: "History · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const { getHistoryUseCase, getCheckInHistoryUseCase, getAllHabitsUseCase, localDateService } =
    getContainer();
  const userId = currentUserId();
  const today = localDateService.today(currentTimezone());

  const [histories, checkIns, habits] = await Promise.all([
    getHistoryUseCase.execute({ userId }),
    getCheckInHistoryUseCase.execute({ userId }),
    getAllHabitsUseCase.execute({ userId }),
  ]);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <p className="mt-1 text-gray-600">
          Review and correct past entries — logs, check-ins, or a missed day.
        </p>
      </div>

      {habits.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Check-ins</h2>
          <CheckInHistoryView checkIns={checkIns} habits={habits} today={today} />
        </div>
      )}

      <div className="flex flex-col gap-4">
        {habits.length > 0 && <h2 className="text-lg font-semibold text-gray-900">Goal logs</h2>}
        <HistoryView histories={histories} />
      </div>
    </section>
  );
}
