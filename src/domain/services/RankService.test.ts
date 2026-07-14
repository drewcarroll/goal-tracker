import { describe, expect, it } from "vitest";
import { RankService, RANK_FORMULA, XP_PER_LOG } from "./RankService";

/**
 * Expected values follow the formula c(k) = round(C − (C−1)·r^(k−1)) with
 * C=7, r=0.8: costs 1, 2, 3, 4, 5, 5, 5, 6, 6, 6, ... flattening to 7.
 * Cumulative days to each rank-up: 1, 3, 6, 10, 15, 20, 25, 31, 37, 43.
 */
describe("RankService", () => {
  const service = new RankService();

  describe("costOfRankUp", () => {
    it("costs exactly one log to leave Rank 1 (first-log rank-up)", () => {
      expect(service.costOfRankUp(1)).toBe(1);
    });

    it("ramps through the documented sequence", () => {
      const costs = Array.from({ length: 10 }, (_, i) => service.costOfRankUp(i + 1));
      expect(costs).toEqual([1, 2, 3, 4, 5, 5, 5, 6, 6, 6]);
    });

    it("flattens to the steady-state cost and stays there (eventually linear)", () => {
      expect(service.costOfRankUp(20)).toBe(RANK_FORMULA.steadyCost);
      expect(service.costOfRankUp(100)).toBe(RANK_FORMULA.steadyCost);
    });
  });

  describe("progressFor", () => {
    it("starts a brand-new user at Rank 1 needing one log", () => {
      expect(service.progressFor(0)).toEqual({
        rank: 1,
        xp: 0,
        xpIntoRank: 0,
        xpForRankUp: XP_PER_LOG,
      });
    });

    it("ranks up on the very first log", () => {
      const progress = service.progressFor(1);
      expect(progress.rank).toBe(2);
      expect(progress.xp).toBe(XP_PER_LOG);
      expect(progress.xpIntoRank).toBe(0);
      expect(progress.xpForRankUp).toBe(2 * XP_PER_LOG);
    });

    it("reaches each early rank on the documented day", () => {
      // Day (cumulative logs) → rank reached: 1→2, 3→3, 6→4, 10→5, 15→6, 20→7.
      const daysToRank: [number, number][] = [
        [1, 2],
        [3, 3],
        [6, 4],
        [10, 5],
        [15, 6],
        [20, 7],
        [25, 8],
        [31, 9],
        [43, 11],
      ];
      for (const [logs, rank] of daysToRank) {
        expect(service.progressFor(logs).rank).toBe(rank);
        expect(service.progressFor(logs - 1).rank).toBe(rank - 1); // the day before, not yet
      }
    });

    it("tracks partial progress within a rank", () => {
      // 4 logs: rank 3 reached at 3, one log into the 3-log climb to rank 4.
      const progress = service.progressFor(4);
      expect(progress.rank).toBe(3);
      expect(progress.xpIntoRank).toBe(1 * XP_PER_LOG);
      expect(progress.xpForRankUp).toBe(3 * XP_PER_LOG);
    });

    it("settles into one rank per steadyCost logs, with no cap", () => {
      const at200 = service.progressFor(200);
      const at207 = service.progressFor(200 + RANK_FORMULA.steadyCost);
      expect(at207.rank).toBe(at200.rank + 1);
      expect(at200.rank).toBeGreaterThan(20);
    });
  });
});
