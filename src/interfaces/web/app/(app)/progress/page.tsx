import type { Metadata } from "next";

export const metadata: Metadata = { title: "Progress · Goal Tracker" };

export default function ProgressPage() {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
      <p className="mt-2 text-gray-600">Charts and progress stats will appear here.</p>
    </section>
  );
}
