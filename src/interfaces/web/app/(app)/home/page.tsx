import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { QuickLogForm } from "@/interfaces/web/components/home/QuickLogForm";

export const metadata: Metadata = { title: "Home · Goal Tracker" };

// Depends on the per-request session, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { authService, listGoalsUseCase } = getContainer();
  const userId = await authService.getCurrentUserId();
  // Middleware and the app shell already gate this route; defence-in-depth.
  if (!userId) {
    redirect("/sign-in");
  }

  const goals = await listGoalsUseCase.execute({ userId });

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Home</h1>
        <p className="mt-1 text-gray-600">Quickly log progress toward a goal.</p>
      </div>
      <QuickLogForm goals={goals} />
    </section>
  );
}
