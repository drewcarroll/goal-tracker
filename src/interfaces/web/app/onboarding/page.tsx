import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import { OnboardingWizard } from "@/interfaces/web/components/onboarding/OnboardingWizard";

export const metadata: Metadata = { title: "Set up habits · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Habit onboarding: pick catalog habits you don't already do, sort them into
 * a difficulty, confirm. Standalone (outside the tab shell) since it's a
 * wizard, not a persistent tab — reachable on first visit post-login or
 * again later from Settings.
 */
export default async function OnboardingPage() {
  const { getHabitCatalogUseCase, getActiveHabitsUseCase } = getContainer();
  const userId = currentUserId();

  const catalog = getHabitCatalogUseCase.execute();
  const existingHabits = await getActiveHabitsUseCase.execute({ userId });
  const alreadyTrackedCatalogIds = existingHabits.map((habit) => habit.catalogId);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-8 sm:px-6">
      <OnboardingWizard catalog={catalog} alreadyTrackedCatalogIds={alreadyTrackedCatalogIds} />
    </main>
  );
}
