import { LocalDate } from "@/domain/value-objects/LocalDate";
import { DailyPlanRepository } from "@/domain/repositories/DailyPlanRepository";
import { GetTodayPlanDTO, DailyPlanDTO } from "../dtos/DailyPlanDTO";
import { DailyPlanMapper } from "../mappers/DailyPlanMapper";

/**
 * Use Case: fetch the plan for a given user-local day, if one was made the
 * night before. Returns null so the caller (interfaces layer) can decide how
 * to prompt for planning now — this use case makes no UI decisions.
 */
export class GetTodayPlanUseCase {
  constructor(private readonly dailyPlanRepository: DailyPlanRepository) {}

  async execute(dto: GetTodayPlanDTO): Promise<DailyPlanDTO | null> {
    const plan = await this.dailyPlanRepository.findByUserIdAndDate(
      dto.userId,
      LocalDate.create(dto.date),
    );
    return plan ? DailyPlanMapper.toDTO(plan) : null;
  }
}
