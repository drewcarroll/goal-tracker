import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { HistoryView } from "@/interfaces/web/components/history/HistoryView";

export const metadata: Metadata = { title: "History · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const { ownerId, getHistoryUseCase } = getContainer();
  const histories = await getHistoryUseCase.execute({ userId: ownerId });

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <p className="mt-1 text-gray-600">
          Review each week and correct entries — add a missed log or remove a mistake.
        </p>
      </div>
      <HistoryView histories={histories} />
    </section>
  );
}
