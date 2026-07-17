import { describe, it, expect } from "vitest";
import { DeterministicRewardService } from "./DeterministicRewardService";
import { ValidationError } from "../errors/DomainError";

describe("DeterministicRewardService", () => {
  const service = new DeterministicRewardService();

  describe("hash01", () => {
    it("is deterministic — the same seed always produces the same value", () => {
      expect(service.hash01("user-1:2026-07-16")).toBe(service.hash01("user-1:2026-07-16"));
    });

    it("different seeds produce different values (not a constant)", () => {
      const values = new Set(
        ["a", "b", "c", "d", "e"].map((seed) => service.hash01(seed)),
      );
      expect(values.size).toBeGreaterThan(1);
    });

    it("always returns a value in [0, 1)", () => {
      for (const seed of ["", "x", "a much longer seed string here", "🎉emoji-seed"]) {
        const value = service.hash01(seed);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });
  });

  describe("weightedPick", () => {
    it("is deterministic for the same seed and options", () => {
      const options = [
        { value: "common", weight: 55 },
        { value: "rare", weight: 30 },
        { value: "epic", weight: 12 },
        { value: "legendary", weight: 3 },
      ];
      expect(service.weightedPick("seed-1", options)).toBe(
        service.weightedPick("seed-1", options),
      );
    });

    it("only ever returns one of the provided options", () => {
      const options = [
        { value: "common", weight: 55 },
        { value: "rare", weight: 30 },
        { value: "epic", weight: 12 },
        { value: "legendary", weight: 3 },
      ];
      for (let i = 0; i < 200; i++) {
        const picked = service.weightedPick(`seed-${i}`, options);
        expect(options.map((o) => o.value)).toContain(picked);
      }
    });

    it("a single 100%-weight option is always picked", () => {
      expect(service.weightedPick("any-seed", [{ value: "only", weight: 1 }])).toBe("only");
    });

    it("rejects an empty option list", () => {
      expect(() => service.weightedPick("seed", [])).toThrow(ValidationError);
    });

    it("rejects a non-positive total weight", () => {
      expect(() =>
        service.weightedPick("seed", [
          { value: "a", weight: 0 },
          { value: "b", weight: 0 },
        ]),
      ).toThrow(ValidationError);
    });

    it("over many seeds, distribution roughly tracks the weights", () => {
      const options = [
        { value: "low", weight: 80 },
        { value: "high", weight: 20 },
      ];
      let lowCount = 0;
      const trials = 2000;
      for (let i = 0; i < trials; i++) {
        if (service.weightedPick(`trial-${i}`, options) === "low") lowCount++;
      }
      const ratio = lowCount / trials;
      expect(ratio).toBeGreaterThan(0.7);
      expect(ratio).toBeLessThan(0.9);
    });
  });
});
