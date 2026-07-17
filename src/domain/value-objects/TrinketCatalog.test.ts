import { describe, it, expect } from "vitest";
import { getTrinketById, trinketSource } from "./TrinketCatalog";

describe("TrinketCatalog", () => {
  it("resolves a battle-pass trinket id", () => {
    const trinket = getTrinketById("bp:2026-07:d25");
    expect(trinket?.emoji).toBe("🗽");
    expect(trinketSource("bp:2026-07:d25")).toBe("battle_pass");
  });

  it("resolves a shop trinket id", () => {
    const trinket = getTrinketById("shop:legendary:01");
    expect(trinket?.emoji).toBe("🐉");
    expect(trinketSource("shop:legendary:01")).toBe("shop");
  });

  it("returns undefined for an unknown id", () => {
    expect(getTrinketById("nope:1")).toBeUndefined();
    expect(trinketSource("nope:1")).toBe("unknown");
  });
});
