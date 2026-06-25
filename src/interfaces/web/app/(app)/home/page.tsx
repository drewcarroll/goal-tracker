import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { HomeView } from "@/interfaces/web/components/home/HomeView";

export const metadata: Metadata = { title: "Home · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { ownerId, listGoalsUseCase } = getContainer();
  const goals = await listGoalsUseCase.execute({ userId: ownerId });

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Home</h1>
        <p className="mt-1 text-gray-600">Quickly log progress toward a goal.</p>
      </div>
      <HomeView goals={goals} />
    </section>
  );
}
