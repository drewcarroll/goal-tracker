import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import { GoalsManager } from "@/interfaces/web/components/goals/GoalsManager";

export const metadata: Metadata = { title: "Goals · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const { listGoalsUseCase } = getContainer();
  const userId = currentUserId();
  const goals = await listGoalsUseCase.execute({ userId });

  return (
    <section className="mx-auto w-full max-w-3xl">
      <GoalsManager initialGoals={goals} />
    </section>
  );
}
