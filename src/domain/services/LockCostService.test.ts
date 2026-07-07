import { describe, it, expect } from "vitest";
import { LockCostService } from "./LockCostService";

describe("LockCostService", () => {
  const service = new LockCostService();

  describe("initialCostFor", () => {
    it("returns the fixed starting cost per difficulty", () => {
      expect(service.initialCostFor("easy")).toBe(25);
      expect(service.initialCostFor("medium")).toBe(35);
      expect(service.initialCostFor("hard")).toBe(45);
    });
  });

  describe("nextCost on PASS", () => {
    it("decrements cost by 1", () => {
      expect(service.nextCost(25, "PASS")).toBe(24);
      expect(service.nextCost(10, "PASS")).toBe(9);
    });

    it("floors at 1 and never goes lower", () => {
      expect(service.nextCost(1, "PASS")).toBe(1);
      expect(service.nextCost(2, "PASS")).toBe(1);
    });
  });

  describe("nextCost on FAIL", () => {
    it("multiplies cost by 1.1 and rounds", () => {
      expect(service.nextCost(25, "FAIL")).toBe(28); // 27.5 -> 28
      expect(service.nextCost(35, "FAIL")).toBe(39); // 38.5 -> 39
      expect(service.nextCost(10, "FAIL")).toBe(11); // 11.0 -> 11
    });

    it("caps at 50 and never exceeds it", () => {
      expect(service.nextCost(45, "FAIL")).toBe(50); // 49.5 -> 50, within cap
      expect(service.nextCost(48, "FAIL")).toBe(50); // 52.8 -> 53, capped
      expect(service.nextCost(50, "FAIL")).toBe(50); // 55 -> capped
    });
  });

  describe("isFormed", () => {
    it("is true once cost reaches the floor", () => {
      expect(service.isFormed(1)).toBe(true);
    });

    it("is false above the floor", () => {
      expect(service.isFormed(2)).toBe(false);
      expect(service.isFormed(25)).toBe(false);
    });
  });
});
