"use client";

import { useState, useTransition } from "react";
import type { LockFormulaConfigDTO } from "@/application/use-cases/GetLockFormulaConfigUseCase";
import { AlertTriangleIcon, WrenchIcon } from "@/interfaces/web/components/icons";
import {
  lockDevModeAction,
  recomputeAllGoalsAction,
  resetLockFormulaAction,
  saveLockFormulaAction,
  unlockDevModeAction,
} from "@/interfaces/web/app/(app)/profile/actions";

function readPath(config: object, path: string): number {
  return path
    .split(".")
    .reduce<unknown>((value, key) => (value as Record<string, unknown>)?.[key], config) as number;
}

/** Rebuild {"a.b": 1} → {a: {b: 1}} for the use case. */
function buildNested(flat: Record<string, number>): Record<string, unknown> {
  const nested: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(flat)) {
    const keys = path.split(".");
    let cursor = nested;
    for (const key of keys.slice(0, -1)) {
      cursor = (cursor[key] ??= {}) as Record<string, unknown>;
    }
    cursor[keys[keys.length - 1]!] = value;
  }
  return nested;
}

/**
 * The password-gated constants editor (docs/progression.md §4). Every knob of
 * the lock formula (docs/lock-formula.md §4), with save / reset-to-defaults /
 * recompute-all. Changes are retroactive: trajectories redraw as if the new
 * constants had always applied.
 */
export function DevModePanel({
  unlocked,
  configDto,
}: {
  unlocked: boolean;
  configDto: LockFormulaConfigDTO | null;
}) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(() =>
    configDto
      ? Object.fromEntries(
          Object.keys(configDto.bounds).map((path) => [
            path,
            String(readPath(configDto.config, path)),
          ]),
        )
      : {},
  );

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
        <p className="text-sm text-gray-600">Tweak the lock-formula constants. Password required.</p>
        {message && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {message.text}
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="flex-1 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-base text-gray-900 shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          <button
            type="button"
            onClick={() => run(() => unlockDevModeAction(password), "Unlocked.")}
            disabled={pending || password.length === 0}
            className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-700 disabled:opacity-60"
          >
            {pending ? "…" : "Unlock"}
          </button>
        </div>
      </div>
    );
  }

  if (!configDto) return null;

  function handleSave() {
    const flat: Record<string, number> = {};
    for (const [path, raw] of Object.entries(values)) {
      flat[path] = Number(raw);
    }
    run(() => saveLockFormulaAction(buildNested(flat)), "Saved. Trajectories now use these constants.");
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-900/20 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 font-semibold text-gray-900">
            <WrenchIcon className="h-4 w-4 text-gray-400" />
            Developer mode
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            The lock formula&apos;s constants. See docs/lock-formula.md for what each one does.
          </p>
        </div>
        <button
          type="button"
          onClick={() => run(() => lockDevModeAction(), "Locked.")}
          className="shrink-0 text-sm font-medium text-gray-500 hover:underline"
        >
          Lock
        </button>
      </div>

      <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
        <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Changing constants rewrites all historical trajectories (costs are replayed from
          scratch). Stored costs refresh on the next check-in per goal, or press “Recompute all”
          to refresh them now.
        </span>
      </p>

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Object.entries(configDto.bounds).map(([path, bound]) => (
          <label key={path} className="min-w-0 text-xs font-medium text-gray-700">
            <span className="block truncate" title={path}>
              {path}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step={bound.integer ? 1 : "any"}
              min={bound.min}
              max={bound.max}
              value={values[path] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [path]: e.target.value }))}
              className="mt-1 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
            <span className="mt-0.5 block text-[10px] font-normal text-gray-400">
              {bound.min}–{bound.max} · default {readPath(configDto.defaults, path)}
            </span>
          </label>
        ))}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() =>
            run(() => resetLockFormulaAction(), "Reset to defaults. Reload to see fresh values.")
          }
          disabled={pending}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
        >
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={() =>
            run(async () => {
              const result = await recomputeAllGoalsAction();
              return result.ok ? { ok: true } : result;
            }, "All goals recomputed under the current constants.")
          }
          disabled={pending}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
        >
          Recompute all goals
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-700 disabled:opacity-60"
        >
          {pending ? "Working…" : "Save constants"}
        </button>
      </div>
    </div>
  );
}
