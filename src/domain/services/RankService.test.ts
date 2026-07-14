import { describe, expect, it } from "vitest";
import { RankService, RANK_THRESHOLDS } from "./RankService";

describe("RankService", () => {
  const service = new RankService();

  describe("rankFor", () => {
    it("starts everyone at Rank 1 with zero points (the day-0 rank up)", () => {
      expect(service.rankFor(0)).toBe(1);
    });

    it("ranks up exactly at each threshold", () => {
      expect(service.rankFor(2)).toBe(1);
      expect(service.rankFor(3)).toBe(2);
      expect(service.rankFor(6)).toBe(2);
      expect(service.rankFor(7)).toBe(3);
      expect(service.rankFor(12)).toBe(4);
      expect(service.rankFor(20)).toBe(5);
      expect(service.rankFor(50)).toBe(8);
    });

    it("caps at the top rank past the last threshold", () => {
      expect(service.rankFor(200)).toBe(RANK_THRESHOLDS.length);
      expect(service.rankFor(10_000)).toBe(RANK_THRESHOLDS.length);
    });
  });

  describe("nextThreshold", () => {
    it("returns the points needed for the next rank", () => {
      expect(service.nextThreshold(0)).toBe(3);
      expect(service.nextThreshold(3)).toBe(7);
      expect(service.nextThreshold(19)).toBe(20);
    });

    it("returns null at the top rank", () => {
      expect(service.nextThreshold(200)).toBeNull();
    });
  });

  it("thresholds are strictly increasing (sanity on future edits)", () => {
    for (let i = 1; i < RANK_THRESHOLDS.length; i++) {
      expect(RANK_THRESHOLDS[i]!).toBeGreaterThan(RANK_THRESHOLDS[i - 1]!);
    }
  });
});
