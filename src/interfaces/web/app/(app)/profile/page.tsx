import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { ProfileAvatar } from "@/interfaces/web/components/profile/ProfileAvatar";
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
    <section className="mx-auto w-full max-w-md">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

      <div className="mt-6 flex flex-col items-center gap-5 rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <ProfileAvatar image={user.image} name={user.name} email={user.email} />

        <div className="flex w-full flex-col gap-1">
          {user.name && (
            <p className="text-lg font-semibold text-gray-900">{user.name}</p>
          )}
          {user.email && (
            <p className="break-all text-sm text-gray-500">{user.email}</p>
          )}
        </div>

        <SignOutButton className="w-full sm:w-auto" />
      </div>
    </section>
  );
}
