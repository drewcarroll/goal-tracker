import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import { JournalHistoryView } from "@/interfaces/web/components/journal/JournalHistoryView";
import { LockIcon } from "@/interfaces/web/components/icons";

export const metadata: Metadata = { title: "Journal · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const { getJournalHistoryUseCase } = getContainer();
  const userId = currentUserId();
  const entries = await getJournalHistoryUseCase.execute({ userId });

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <LockIcon className="h-5 w-5 text-brand" />
          <h1 className="text-2xl font-bold tracking-tight">Journal</h1>
        </div>
        <p className="text-gray-600">Private. Nobody else can see this.</p>
      </div>
      <JournalHistoryView entries={entries} />
    </section>
  );
}
