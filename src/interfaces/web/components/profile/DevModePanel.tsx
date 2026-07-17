"use client";

import { useState, useTransition } from "react";
import { AlertTriangleIcon } from "@/interfaces/web/components/icons";

interface ConfigDTO {
  config: object;
  defaults: object;
  bounds: Record<string, { min: number; max: number; integer?: boolean }>;
}

type ActionResult = { ok: true } | { ok: false; error: string };

export interface DevModePanelExtraAction {
  label: string;
  onClick: () => Promise<ActionResult>;
  successText: string;
}

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
 * A single constants editor panel — generic over whichever config it's
 * pointed at (lock formula, economy, ...). The password gate itself lives
 * one level up in DevModeGate, since dev mode is one cookie shared by every
 * panel, not a per-panel concept.
 */
export function DevModePanel({
  title,
  hint,
  warning,
  configDto,
  onSave,
  onReset,
  extraActions,
}: {
  title: string;
  hint: string;
  warning?: string;
  configDto: ConfigDTO | null;
  onSave: (config: Record<string, unknown>) => Promise<ActionResult>;
  onReset: () => Promise<ActionResult>;
  extraActions?: DevModePanelExtraAction[];
}) {
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

  function run(action: () => Promise<ActionResult>, okText: string) {
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

  if (!configDto) return null;

  function handleSave() {
    const flat: Record<string, number> = {};
    for (const [path, raw] of Object.entries(values)) {
      flat[path] = Number(raw);
    }
    run(() => onSave(buildNested(flat)), "Saved.");
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-900/20 bg-white p-5 shadow-sm">
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-600">{hint}</p>
      </div>

      {warning && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{warning}</span>
        </p>
      )}

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
          onClick={() => run(() => onReset(), "Reset to defaults. Reload to see fresh values.")}
          disabled={pending}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
        >
          Reset to defaults
        </button>
        {extraActions?.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => run(action.onClick, action.successText)}
            disabled={pending}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
          >
            {action.label}
          </button>
        ))}
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
