import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import { OnboardingWizard } from "@/interfaces/web/components/onboarding/OnboardingWizard";

export const metadata: Metadata = { title: "Set up goals · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Goal onboarding: pick suggested ideas (or type your own), sort them into a
 * difficulty + weekly frequency, confirm. Standalone (outside the tab shell)
 * since it's a wizard, not a persistent tab — reachable on first visit post-
 * login or again later from /goals.
 */
export default async function OnboardingPage() {
  const { getGoalSuggestionsUseCase, getActiveGoalsUseCase } = getContainer();
  const userId = currentUserId();

  const suggestions = getGoalSuggestionsUseCase.execute();
  const existingGoals = await getActiveGoalsUseCase.execute({ userId });
  const alreadyTrackedNames = existingGoals.map((goal) => goal.name.trim().toLowerCase());

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-8 sm:px-6">
      <OnboardingWizard suggestions={suggestions} alreadyTrackedNames={alreadyTrackedNames} />
    </main>
  );
}
