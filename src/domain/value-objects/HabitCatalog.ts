/**
 * The hardcoded habit catalog — NOT a DB table. MVP allows no custom habits,
 * so every `Habit.catalogId` must resolve to an entry here; the catalog is
 * consistent across every user by construction.
 */

export type HabitCategory = "physical" | "addiction" | "mind" | "skills" | "misc";
export type HabitType = "binary" | "timed";

export interface HabitCatalogEntry {
  id: string;
  label: string;
  category: HabitCategory;
  type: HabitType;
  /**
   * Only present when `type === "timed"`. The "20min rule": one session of at
   * least this many minutes counts as a full pass — no extra credit for
   * longer sessions, and no hourly/cumulative tracking.
   */
  minMinutes?: number;
}

export const HABIT_CATALOG: readonly HabitCatalogEntry[] = [
  // Physical
  { id: "exercise", label: "Exercise", category: "physical", type: "binary" },
  { id: "cold-shower", label: "Cold shower", category: "physical", type: "binary" },
  { id: "stretch", label: "Stretch", category: "physical", type: "binary" },
  { id: "floss", label: "Floss", category: "physical", type: "binary" },
  { id: "brush-teeth-twice", label: "Brush teeth twice", category: "physical", type: "binary" },
  {
    id: "morning-walk",
    label: "10min morning walk",
    category: "physical",
    type: "timed",
    minMinutes: 10,
  },

  // Addiction
  { id: "no-alcohol", label: "No alcohol", category: "addiction", type: "binary" },
  { id: "no-drugs", label: "No drugs", category: "addiction", type: "binary" },
  { id: "no-fap", label: "No fap", category: "addiction", type: "binary" },
  { id: "no-soda", label: "No soda", category: "addiction", type: "binary" },
  { id: "no-smoking", label: "No smoking", category: "addiction", type: "binary" },
  {
    id: "no-caffeine-after-noon",
    label: "No caffeine after noon",
    category: "addiction",
    type: "binary",
  },

  // Mind
  { id: "read", label: "Read 15min+", category: "mind", type: "timed", minMinutes: 15 },
  { id: "meditate", label: "Meditate 5min+", category: "mind", type: "timed", minMinutes: 5 },

  // Skills
  { id: "code", label: "Code 20min+", category: "skills", type: "timed", minMinutes: 20 },
  {
    id: "practice-music",
    label: "Practice music 20min+",
    category: "skills",
    type: "timed",
    minMinutes: 20,
  },

  // Misc
  { id: "cook-a-meal", label: "Cook a meal", category: "misc", type: "binary" },
  { id: "eat-vegetables", label: "Eat a serving of vegetables", category: "misc", type: "binary" },
  {
    id: "reach-out",
    label: "Reach out to friend/family",
    category: "misc",
    type: "binary",
  },
  { id: "make-bed", label: "Make bed", category: "misc", type: "binary" },
  { id: "wear-sunscreen", label: "Wear sunscreen", category: "misc", type: "binary" },
] as const;

export function findCatalogEntry(catalogId: string): HabitCatalogEntry | undefined {
  return HABIT_CATALOG.find((entry) => entry.id === catalogId);
}

export function isValidCatalogId(catalogId: string): boolean {
  return findCatalogEntry(catalogId) !== undefined;
}
