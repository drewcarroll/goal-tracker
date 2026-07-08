/**
 * Optional quick-add ideas shown when creating a goal — NOT a closed catalog.
 * A goal's name is always freeform text; picking a suggestion just prefills
 * it. Nothing in the domain references these ids after creation, so this
 * list can be edited freely without touching any stored data.
 */

export type GoalCategory = "physical" | "addiction" | "mind" | "skills" | "misc";

export interface GoalSuggestion {
  label: string;
  category: GoalCategory;
}

export const GOAL_SUGGESTIONS: readonly GoalSuggestion[] = [
  // Physical
  { label: "Exercise", category: "physical" },
  { label: "Cold shower", category: "physical" },
  { label: "Stretch", category: "physical" },
  { label: "Floss", category: "physical" },
  { label: "Brush teeth twice", category: "physical" },
  { label: "Morning walk", category: "physical" },

  // Addiction
  { label: "No alcohol", category: "addiction" },
  { label: "No drugs", category: "addiction" },
  { label: "No soda", category: "addiction" },
  { label: "No smoking", category: "addiction" },
  { label: "No caffeine after noon", category: "addiction" },

  // Mind
  { label: "Read", category: "mind" },
  { label: "Meditate", category: "mind" },

  // Skills
  { label: "Code", category: "skills" },
  { label: "Practice music", category: "skills" },

  // Misc
  { label: "Cook a meal", category: "misc" },
  { label: "Eat a serving of vegetables", category: "misc" },
  { label: "Reach out to friend/family", category: "misc" },
  { label: "Make bed", category: "misc" },
  { label: "Wear sunscreen", category: "misc" },
] as const;

export const GOAL_CATEGORY_LABELS: Record<GoalCategory, string> = {
  physical: "Physical",
  addiction: "Addiction",
  mind: "Mind",
  skills: "Skills",
  misc: "Misc",
};
