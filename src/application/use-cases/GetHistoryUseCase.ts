import { Goal } from "@/domain/entities/Goal";
import { LogEntry } from "@/domain/entities/LogEntry";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { LogRepository } from "@/domain/repositories/LogRepository";
import { GoalHistoryDTO, HistoryWeekDTO } from "../dtos/HistoryDTO";
import { LogMapper } from "../mappers/LogMapper";
import { Clock } from "../ports/Clock";

/**
 * Use Case: build the per-week history of every goal a user owns — each week's
 * date range, target reference, total, and the individual log entries behind it
 * — so the history view can show and remove entries retroactively. Scoped to
 * the caller: only their own goals (and the logs hanging off them) are read.
 */
export class GetHistoryUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly logRepository: LogRepository,
    private readonly clock: Clock,
  ) {}

  async execute(dto: { userId: string }): Promise<GoalHistoryDTO[]> {
    const goals = await this.goalRepository.findByUserId(dto.userId);
    const today = this.clock.now();

    return Promise.all(goals.map((goal) => this.historyFor(goal, today)));
  }

  private async historyFor(goal: Goal, today: Date): Promise<GoalHistoryDTO> {
    const logs = await this.logRepository.findByGoalId(goal.id);
    const projection = goal.project(today);
    const timeframe = goal.timeframe;

    const entriesByWeek = this.groupByWeek(logs);

    const weeks: HistoryWeekDTO[] = projection.weeks.map((week) => {
      const range = timeframe.weekRange(week.weekIndex);
      const entries = (entriesByWeek.get(week.weekIndex) ?? [])
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((entry) => LogMapper.toDTO(entry));
      return {
        index: week.weekIndex,
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
        kind: week.kind,
        weeklyTarget: projection.weeklyTarget,
        total: week.actual,
        entries,
      };
    });

    return {
      goalId: goal.id,
      goalName: goal.name,
      unit: goal.unit,
      weeklyTarget: projection.weeklyTarget,
      totalWeeks: projection.totalWeeks,
      currentWeekIndex: timeframe.weekIndexOn(today),
      weeks,
    };
  }

  /** Bucket a goal's log entries by the week index they were attributed to. */
  private groupByWeek(logs: LogEntry[]): Map<number, LogEntry[]> {
    const byWeek = new Map<number, LogEntry[]>();
    for (const log of logs) {
      const bucket = byWeek.get(log.weekIndex);
      if (bucket) bucket.push(log);
      else byWeek.set(log.weekIndex, [log]);
    }
    return byWeek;
  }
}
