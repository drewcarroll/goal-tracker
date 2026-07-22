"use client";

import { useState, useTransition } from "react";
import { GiftBoxIcon, CoinIcon } from "@/interfaces/web/components/icons";
import { RarityTag, RARITY_TEXT } from "./RarityTag";
import { formatTrinketLevel } from "./trinketLevel";
import { openMysteryBoxAction } from "@/interfaces/web/app/(app)/shop/actions";
import type { OpenMysteryBoxResultDTO } from "@/application/dtos/MysteryBoxDTO";

const RARITY_GLOW: Record<string, string> = {
  common: "text-gray-300",
  rare: "text-sky-400",
  epic: "text-violet-400",
  legendary: "text-amber-400",
};

type Phase = "idle" | "opening" | "revealed";

/**
 * Replaces the old 5-slot shop grid (2026-07-21): a single purchase button
 * that shakes with anticipation, then reveals whatever it rolled with a
 * rarity-colored glow. Not collect-once — a duplicate levels the trinket up
 * (see Collection), so "opening another" of the same box is the whole loop.
 */
export function MysteryBoxCard({ price, initialBalance }: { price: number; initialBalance: number }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [balance, setBalance] = useState(initialBalance);
  const [result, setResult] = useState<OpenMysteryBoxResultDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const affordable = balance >= price;

  function open() {
    setError(null);
    setPhase("opening");
    startTransition(async () => {
      const [actionResult] = await Promise.all([
        openMysteryBoxAction(),
        new Promise((resolve) => setTimeout(resolve, 900)), // let the shake play out
      ]);
      if (actionResult.ok) {
        setResult(actionResult.result);
        setBalance(actionResult.result.balance);
        setPhase("revealed");
      } else {
        setError(actionResult.error);
        setPhase("idle");
      }
    });
  }

  function openAnother() {
    setResult(null);
    setPhase("idle");
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-900/[0.06] bg-white p-6 text-center shadow-sm">
      {error && (
        <p role="alert" className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {phase !== "revealed" ? (
        <>
          <button
            type="button"
            onClick={open}
            disabled={pending || !affordable}
            className={`flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50 ${
              phase === "opening" ? "animate-box-shake" : "hover:scale-105"
            }`}
          >
            <GiftBoxIcon className="h-14 w-14" />
          </button>
          <div>
            <p className="font-display text-lg font-bold text-gray-900">Mystery Box</p>
            <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-gray-600">
              <CoinIcon className="h-4 w-4 text-amber-500" />
              {price.toLocaleString()}
            </p>
          </div>
          {!affordable && <p className="text-xs text-gray-400">Not enough coins yet.</p>}
        </>
      ) : (
        result && (
          <>
            <div className="relative flex h-28 w-28 items-center justify-center">
              <div
                className={`animate-reveal-glow absolute inset-0 rounded-full ${RARITY_GLOW[result.trinket.rarity]}`}
                aria-hidden
              />
              <span className="animate-pop-in text-6xl leading-none">{result.trinket.emoji}</span>
            </div>
            <div>
              <p className={`font-display text-lg font-bold ${RARITY_TEXT[result.trinket.rarity]}`}>
                {result.trinket.name}
              </p>
              <div className="mt-1 flex items-center justify-center gap-2">
                <RarityTag rarity={result.trinket.rarity} />
                <span className="text-xs font-bold text-gray-500">
                  {formatTrinketLevel(result.quantity)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={openAnother}
              className="mt-1 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
            >
              Open another
            </button>
          </>
        )
      )}
    </div>
  );
}
