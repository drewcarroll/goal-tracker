import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { ProgressView } from "@/interfaces/web/components/progress/ProgressView";

export const metadata: Metadata = { title: "Progress · Goal Tracker" };

// Depends on the per-request session, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const { authService, getProgressDataUseCase } = getContainer();
  const userId = await authService.getCurrentUserId();
  // Middleware and the app shell already gate this route; defence-in-depth.
  if (!userId) {
    redirect("/sign-in");
  }

  const charts = await getProgressDataUseCase.execute({ userId });

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <p className="mt-1 text-gray-600">
          Session completion and your cumulative pace toward each goal.
        </p>
      </div>
      <ProgressView charts={charts} />
    </section>
  );
}
