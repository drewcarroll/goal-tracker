"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInAction, signUpAction } from "@/interfaces/web/actions/auth";

type Mode = "sign-in" | "sign-up";

/**
 * Email/password authentication form backed by Supabase Auth.
 *
 * On success the Supabase browser client persists the session to cookies, which
 * the middleware then recognises; we refresh the router so server components
 * re-render as the authenticated user.
 */
export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirectedFrom") || "/home";

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);

    try {
      if (mode === "sign-up") {
        const result = await signUpAction(email, password);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.needsConfirmation) {
          setMessage("Check your email to confirm your account, then sign in.");
          setMode("sign-in");
          return;
        }
      } else {
        const result = await signInAction(email, password);
        if (result.error) {
          setError(result.error);
          return;
        }
      }

      router.replace(redirectedFrom);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {message && <p className="text-sm text-green-700">{message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand/90 disabled:opacity-60"
      >
        {pending ? "Please wait…" : mode === "sign-up" ? "Create account" : "Sign in"}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode((m) => (m === "sign-in" ? "sign-up" : "sign-in"));
          setError(null);
          setMessage(null);
        }}
        className="text-sm text-gray-600 underline-offset-2 hover:underline"
      >
        {mode === "sign-in"
          ? "Need an account? Create one"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
