import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in · Goal Tracker" };

// Reads the per-request `error` query param, so it must not be prerendered.
export const dynamic = "force-dynamic";

/**
 * Username gate. A plain HTML form posts to /api/login, which stores the
 * username (and the browser's timezone, captured by a small inline script —
 * everything still works with JS disabled, just defaulting to UTC) in
 * cookies and redirects to /home. There is no password: the username alone
 * identifies which data you see.
 */
export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const hasError = searchParams.error != null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-brand">Goal Tracker</h1>
        <p className="text-sm text-gray-600">Enter your username to continue.</p>
      </div>

      <form
        method="POST"
        action="/api/login"
        className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700">Username</span>
          <input
            type="text"
            name="username"
            autoFocus
            autoComplete="username"
            required
            placeholder="e.g. drew"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        {/* Progressive enhancement: filled in by the inline script below so
            habit day boundaries can use the user's local day. Falls back to
            UTC server-side if JS is disabled and this stays empty. */}
        <input type="hidden" name="timezone" id="timezone-input" />
        <script
          // Static, no user input interpolated — safe as an inline script.
          dangerouslySetInnerHTML={{
            __html:
              "document.getElementById('timezone-input').value = " +
              "Intl.DateTimeFormat().resolvedOptions().timeZone;",
          }}
        />

        {hasError && (
          <p role="alert" className="text-sm text-red-600">
            Enter a username to continue.
          </p>
        )}

        <button
          type="submit"
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          Next
        </button>
      </form>
    </main>
  );
}
