import { describe, it, expect } from "vitest";
import {
  getBattlePassMonthDefinition,
  isBattlePassMonthSupported,
  allBattlePassTrinkets,
} from "./BattlePassCalendarMap";

describe("BattlePassCalendarMap", () => {
  it("supports exactly July 2026 through June 2027", () => {
    expect(isBattlePassMonthSupported(2026, 7)).toBe(true);
    expect(isBattlePassMonthSupported(2027, 6)).toBe(true);
    expect(isBattlePassMonthSupported(2026, 6)).toBe(false); // one month before
    expect(isBattlePassMonthSupported(2027, 7)).toBe(false); // one month after
  });

  it("does not cycle — a random future year is unsupported, not wrapped modulo 12", () => {
    expect(isBattlePassMonthSupported(2030, 7)).toBe(false);
    expect(isBattlePassMonthSupported(2099, 1)).toBe(false);
  });

  it("every month has trinkets on exactly days 5, 10, 15, 20, 25", () => {
    const definition = getBattlePassMonthDefinition(2026, 7)!;
    expect(Object.keys(definition.trinketByDay).map(Number).sort((a, b) => a - b)).toEqual([
      5, 10, 15, 20, 25,
    ]);
  });

  it("every trinket id is bp-namespaced and unique across all 12 months", () => {
    const trinkets = allBattlePassTrinkets();
    expect(trinkets).toHaveLength(12 * 5);
    const ids = trinkets.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith("bp:"))).toBe(true);
  });
});
