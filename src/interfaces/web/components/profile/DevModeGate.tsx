"use client";

import { useState, useTransition, type ReactNode } from "react";
import { WrenchIcon } from "@/interfaces/web/components/icons";
import { lockDevModeAction, unlockDevModeAction } from "@/interfaces/web/app/(app)/profile/actions";

/**
 * The single password gate for developer mode — unlocking here reveals
 * every constants panel (lock formula, economy, ...) passed as children.
 * Split out of DevModePanel (2026-07-16) so a second panel (EconomyConfig)
 * doesn't need its own separate password prompt for the same one cookie.
 */
export function DevModeGate({ unlocked, children }: { unlocked: boolean; children: ReactNode }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>, okText: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      setMessage(
        result.ok
          ? { kind: "ok", text: okText }
          : { kind: "error", text: result.error ?? "Something went wrong." },
      );
    });
  }

  if (!unlocked) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-gray-300 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Developer mode</h2>
        <p className="text-sm text-gray-600">Tweak the formula constants. Password required.</p>
        {message && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {message.text}
          </p>
        )}
        <div className="flex min-w-0 items-stretch gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-base text-gray-900 shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          <button
            type="button"
            onClick={() => run(() => unlockDevModeAction(password), "Unlocked.")}
            disabled={pending || password.length === 0}
            className="shrink-0 whitespace-nowrap rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-700 disabled:opacity-60"
          >
            {pending ? "…" : "Unlock"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 font-semibold text-gray-900">
          <WrenchIcon className="h-4 w-4 text-gray-400" />
          Developer mode
        </h2>
        <button
          type="button"
          onClick={() => run(() => lockDevModeAction(), "Locked.")}
          className="shrink-0 text-sm font-medium text-gray-500 hover:underline"
        >
          Lock
        </button>
      </div>
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`rounded-lg px-3 py-2 text-sm ${
            message.kind === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {message.text}
        </p>
      )}
      {children}
    </div>
  );
}
