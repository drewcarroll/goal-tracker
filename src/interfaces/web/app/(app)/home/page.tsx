import type { Metadata } from "next";

export const metadata: Metadata = { title: "Home · Goal Tracker" };

export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Home</h1>
      <p className="mt-2 text-gray-600">Your dashboard overview will appear here.</p>
    </section>
  );
}
