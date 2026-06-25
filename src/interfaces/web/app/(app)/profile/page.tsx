import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { SignOutButton } from "@/interfaces/web/components/auth/SignOutButton";

export const metadata: Metadata = { title: "Profile · Goal Tracker" };

// Depends on the per-request session, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { authService } = getContainer();
  const user = await authService.getCurrentUser();
  // Middleware already gates this route; this is defence-in-depth.
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <p className="mt-2 text-gray-600">Account settings and preferences will appear here.</p>

      <dl className="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <dt className="font-medium text-gray-500">Signed in as</dt>
        <dd className="mt-1 text-gray-900">{user.email ?? user.id}</dd>
      </dl>

      <div className="mt-6">
        <SignOutButton />
      </div>
    </section>
  );
}
