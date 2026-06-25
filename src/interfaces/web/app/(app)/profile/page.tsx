import type { Metadata } from "next";

export const metadata: Metadata = { title: "Profile · Goal Tracker" };

export default function ProfilePage() {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <p className="mt-2 text-gray-600">Account settings and preferences will appear here.</p>
    </section>
  );
}
