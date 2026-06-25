import type { Metadata } from "next";

export const metadata: Metadata = { title: "Unlock · Goal Tracker" };

// Reads the per-request `error` query param, so it must not be prerendered.
export const dynamic = "force-dynamic";

/**
 * Password gate. A plain HTML form (no client JS) posts to /api/unlock, which
 * sets the auth cookie and redirects to /home — or back here with `?error=1` on
 * a wrong password.
 */
export default function UnlockPage({ searchParams }: { searchParams: { error?: string } }) {
  const hasError = searchParams.error != null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-brand">Goal Tracker</h1>
        <p className="text-sm text-gray-600">Enter the password to continue.</p>
      </div>

      <form
        method="POST"
        action="/api/unlock"
        className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700">Password</span>
          <input
            type="password"
            name="password"
            autoFocus
            autoComplete="current-password"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        {hasError && (
          <p role="alert" className="text-sm text-red-600">
            Incorrect password. Try again.
          </p>
        )}

        <button
          type="submit"
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          Unlock
        </button>
      </form>
    </main>
  );
}
