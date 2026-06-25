import { Goal } from "../entities/Goal";

export interface GoalStats {
  total: number;
  active: number;
  completed: number;
  archived: number;
  averageProgress: number;
  completionRate: number;
}

/**
 * Domain Service — logic that spans multiple Goal entities and
 * doesn't naturally belong to a single one. Pure; no I/O.
 */
export class GoalStatsService {
  compute(goals: Goal[]): GoalStats {
    const total = goals.length;
    let active = 0;
    let completed = 0;
    let archived = 0;
    let progressSum = 0;

    for (const goal of goals) {
      const status = goal.status.toString();
      if (status === "active") active += 1;
      else if (status === "completed") completed += 1;
      else if (status === "archived") archived += 1;
      progressSum += goal.progress.value();
    }

    const averageProgress = total === 0 ? 0 : Math.round(progressSum / total);
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { total, active, completed, archived, averageProgress, completionRate };
  }
}
