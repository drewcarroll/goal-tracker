import { LocalDate } from "@/domain/value-objects/LocalDate";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { GetTodayPlanDTO } from "../dtos/DailyPlanDTO";
import { CheckInDTO } from "../dtos/CheckInDTO";
import { CheckInMapper } from "../mappers/CheckInMapper";

/** Use Case: fetch the check-in for a given user-local day, if one exists yet. */
export class GetTodayCheckInUseCase {
  constructor(private readonly checkInRepository: CheckInRepository) {}

  async execute(dto: GetTodayPlanDTO): Promise<CheckInDTO | null> {
    const checkIn = await this.checkInRepository.findByUserIdAndDate(
      dto.userId,
      LocalDate.create(dto.date),
    );
    return checkIn ? CheckInMapper.toDTO(checkIn) : null;
  }
}
