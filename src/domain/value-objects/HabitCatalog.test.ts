import { describe, it, expect } from "vitest";
import { HABIT_CATALOG, findCatalogEntry, isValidCatalogId } from "./HabitCatalog";

describe("HabitCatalog", () => {
  it("has no duplicate ids", () => {
    const ids = HABIT_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every timed entry a positive minMinutes, and no binary entry one", () => {
    for (const entry of HABIT_CATALOG) {
      if (entry.type === "timed") {
        expect(entry.minMinutes).toBeGreaterThan(0);
      } else {
        expect(entry.minMinutes).toBeUndefined();
      }
    }
  });

  it("finds an entry by id", () => {
    expect(findCatalogEntry("meditate")?.label).toBe("Meditate 5min+");
  });

  it("returns undefined for an unknown id", () => {
    expect(findCatalogEntry("not-a-real-habit")).toBeUndefined();
  });

  it("validates catalog ids", () => {
    expect(isValidCatalogId("exercise")).toBe(true);
    expect(isValidCatalogId("not-a-real-habit")).toBe(false);
  });
});
