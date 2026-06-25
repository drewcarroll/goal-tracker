import type { Metadata } from "next";

export const metadata: Metadata = { title: "Goals · Goal Tracker" };

export default function GoalsPage() {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
      <p className="mt-2 text-gray-600">Your goals will be listed and managed here.</p>
    </section>
  );
}
