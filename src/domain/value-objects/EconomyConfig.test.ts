import { describe, expect, it } from "vitest";
import {
  DEFAULT_ECONOMY_CONFIG,
  assertValidEconomyConfig,
  economyConfigFrom,
} from "./EconomyConfig";
import { ValidationError } from "../errors/DomainError";

describe("EconomyConfig", () => {
  it("the shipped defaults are themselves valid", () => {
    expect(() => assertValidEconomyConfig(DEFAULT_ECONOMY_CONFIG)).not.toThrow();
  });

  describe("economyConfigFrom", () => {
    it("returns pure defaults for a missing override", () => {
      expect(economyConfigFrom(null)).toEqual(DEFAULT_ECONOMY_CONFIG);
      expect(economyConfigFrom(undefined)).toEqual(DEFAULT_ECONOMY_CONFIG);
      expect(economyConfigFrom({})).toEqual(DEFAULT_ECONOMY_CONFIG);
    });

    it("merges a partial override over defaults", () => {
      const config = economyConfigFrom({ shopTrinketPrice: 300 });
      expect(config.shopTrinketPrice).toBe(300);
      expect(config.coinsLowAmount).toBe(DEFAULT_ECONOMY_CONFIG.coinsLowAmount);
    });

    it("rejects an out-of-range override", () => {
      expect(() => economyConfigFrom({ coinsHighProbability: 1.5 })).toThrow(ValidationError);
    });

    it("rejects a non-integer where an integer is required", () => {
      expect(() => economyConfigFrom({ shopTrinketPrice: 200.5 })).toThrow(ValidationError);
    });
  });
});
