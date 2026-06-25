import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-brand">Goal Tracker</h1>
      <p className="text-lg text-gray-600">
        A goal tracking application built with Next.js, TypeScript, Tailwind CSS, and Supabase,
        following Clean Architecture.
      </p>

      <div>
        <Link
          href="/sign-in"
          className="inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand/90"
        >
          Sign in
        </Link>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">API Endpoints</h2>
        <p className="mb-3 text-xs text-gray-500">
          All endpoints require an authenticated session; the acting user is taken from the session,
          never from request input.
        </p>
        <ul className="space-y-2 text-sm">
          <li>
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">GET /api/goals</code> —
            list your goals
          </li>
          <li>
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">POST /api/goals</code> —
            create a goal
          </li>
          <li>
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">
              PATCH /api/goals/:id/progress
            </code>{" "}
            — update progress on one of your goals
          </li>
          <li>
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">GET /api/goals/stats</code>{" "}
            — aggregate stats for your goals
          </li>
        </ul>
      </section>

      <p className="text-sm text-gray-500">
        See <code className="font-mono">README.md</code> and the per-layer{" "}
        <code className="font-mono">CLAUDE.md</code> files for architecture details.
      </p>
    </main>
  );
}
