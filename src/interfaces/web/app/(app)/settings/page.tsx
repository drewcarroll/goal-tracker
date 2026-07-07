import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import { SettingsView } from "@/interfaces/web/components/settings/SettingsView";

export const metadata: Metadata = { title: "Settings · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { getAllHabitsUseCase } = getContainer();
  const userId = currentUserId();
  const habits = await getAllHabitsUseCase.execute({ userId });

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-gray-600">Manage your habits.</p>
      </div>
      <SettingsView habits={habits} />
    </section>
  );
}
