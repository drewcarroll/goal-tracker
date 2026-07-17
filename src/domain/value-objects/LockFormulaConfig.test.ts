import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCK_FORMULA_CONFIG,
  assertValidLockFormulaConfig,
  lockFormulaConfigFrom,
} from "./LockFormulaConfig";
import { ValidationError } from "../errors/DomainError";

describe("LockFormulaConfig", () => {
  it("the shipped defaults are themselves valid", () => {
    expect(() => assertValidLockFormulaConfig(DEFAULT_LOCK_FORMULA_CONFIG)).not.toThrow();
  });

  describe("lockFormulaConfigFrom", () => {
    it("returns pure defaults for a missing override", () => {
      expect(lockFormulaConfigFrom(null)).toEqual(DEFAULT_LOCK_FORMULA_CONFIG);
      expect(lockFormulaConfigFrom(undefined)).toEqual(DEFAULT_LOCK_FORMULA_CONFIG);
      expect(lockFormulaConfigFrom({})).toEqual(DEFAULT_LOCK_FORMULA_CONFIG);
    });

    it("merges partial overrides over defaults", () => {
      const config = lockFormulaConfigFrom({
        gainRate: 0.1,
        initialCost: 30,
      });
      expect(config.gainRate).toBe(0.1);
      expect(config.initialCost).toBe(30);
      expect(config.lossAversion).toBe(DEFAULT_LOCK_FORMULA_CONFIG.lossAversion);
    });

    it("rejects out-of-range overrides", () => {
      expect(() => lockFormulaConfigFrom({ gainRate: 0.5 })).toThrow(ValidationError);
      expect(() => lockFormulaConfigFrom({ lossAversion: 0 })).toThrow(ValidationError);
      expect(() => lockFormulaConfigFrom({ minStrength: 1 })).toThrow(ValidationError);
      expect(() => lockFormulaConfigFrom({ initialCost: 60 })).toThrow(ValidationError);
    });

    it("rejects non-integers where an integer is required", () => {
      expect(() => lockFormulaConfigFrom({ calibrationDays: 5.5 })).toThrow(ValidationError);
      expect(() => lockFormulaConfigFrom({ initialCost: 30.7 })).toThrow(ValidationError);
    });

    it("rejects non-numeric values", () => {
      expect(() => lockFormulaConfigFrom({ gainRate: "fast" })).toThrow(ValidationError);
      expect(() => lockFormulaConfigFrom({ gainRate: NaN })).toThrow(ValidationError);
    });
  });
});
