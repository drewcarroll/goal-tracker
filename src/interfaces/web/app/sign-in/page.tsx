import { Suspense } from "react";
import type { Metadata } from "next";
import { SignInForm } from "@/interfaces/web/components/auth/SignInForm";

export const metadata: Metadata = { title: "Sign in · Goal Tracker" };

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-brand">Goal Tracker</h1>
        <p className="text-sm text-gray-600">Sign in to track and achieve your goals.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* useSearchParams() requires a Suspense boundary during prerender. */}
        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
      </div>
    </main>
  );
}
