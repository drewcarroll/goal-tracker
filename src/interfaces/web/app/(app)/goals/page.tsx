import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { GoalsManager } from "@/interfaces/web/components/goals/GoalsManager";

export const metadata: Metadata = { title: "Goals · Goal Tracker" };

// Depends on the per-request session, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const { authService, listGoalsUseCase } = getContainer();
  const userId = await authService.getCurrentUserId();
  // Middleware and the app shell already gate this route; defence-in-depth.
  if (!userId) {
    redirect("/sign-in");
  }

  const goals = await listGoalsUseCase.execute({ userId });

  return (
    <section className="mx-auto w-full max-w-3xl">
      <GoalsManager initialGoals={goals} />
    </section>
  );
}
