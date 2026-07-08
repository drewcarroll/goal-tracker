import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import { GoalsManager } from "@/interfaces/web/components/goals/GoalsManager";

export const metadata: Metadata = { title: "Goals · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const { getAllGoalsUseCase, getGoalSuggestionsUseCase } = getContainer();
  const userId = currentUserId();
  const goals = await getAllGoalsUseCase.execute({ userId });
  const suggestions = getGoalSuggestionsUseCase.execute();

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
        <p className="mt-1 text-gray-600">
          What you&apos;re committing to, and how often each week.
        </p>
      </div>
      <GoalsManager initialGoals={goals} suggestions={suggestions} />
    </section>
  );
}
