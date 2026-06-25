import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { GoalsManager } from "@/interfaces/web/components/goals/GoalsManager";

export const metadata: Metadata = { title: "Goals · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const { ownerId, listGoalsUseCase } = getContainer();
  const goals = await listGoalsUseCase.execute({ userId: ownerId });

  return (
    <section className="mx-auto w-full max-w-3xl">
      <GoalsManager initialGoals={goals} />
    </section>
  );
}
