import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { GetProgressDataDTO, ProgressChartDTO } from "../dtos/ProgressDTO";
import { ProgressMapper } from "../mappers/ProgressMapper";
import { Clock } from "../ports/Clock";

/**
 * Use Case: build chart-ready progress data for every goal a user owns —
 * per-week logged totals, weekly target reference values, and the cumulative
 * target, actual, and projected series. Scoped to the caller: only their own
 * goals are read (the repository is queried by the session-derived userId).
 */
export class GetProgressDataUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly clock: Clock,
  ) {}

  async execute(dto: GetProgressDataDTO): Promise<ProgressChartDTO[]> {
    const goals = await this.goalRepository.findByUserId(dto.userId);
    return ProgressMapper.toDTOList(goals, this.clock.now());
  }
}
