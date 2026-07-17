import { Goal } from "../entities/Goal";
import { GoalMark } from "../entities/CheckIn";

/**
 * Domain service that owns the single rule "a friend never sees a private
 * goal" — every friend-facing use case funnels through here so the rule
 * can't drift between call sites. A private goal is not just hidden with a
 * placeholder; it is REMOVED from the result entirely, so its existence
 * never leaks (docs/plan.md Phase 11): a day where every scheduled goal was
 * private must look identical to a day with no plan at all.
 */
export class GoalPrivacyService {
  /** Goals a friend is allowed to see. */
  filterPublicGoals(goals: readonly Goal[]): Goal[] {
    return goals.filter((goal) => goal.isPublic);
  }

  /** Marks belonging only to goals a friend is allowed to see. */
  filterPublicMarks(marks: readonly GoalMark[], publicGoalIds: ReadonlySet<string>): GoalMark[] {
    return marks.filter((mark) => publicGoalIds.has(mark.goalId));
  }
}
