import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { CheckInDTO } from "../dtos/CheckInDTO";
import { CheckInMapper } from "../mappers/CheckInMapper";

export interface GetCheckInHistoryDTO {
  userId: string;
}

/** Use Case: list every past check-in for a user, most recent first. */
export class GetCheckInHistoryUseCase {
  constructor(private readonly checkInRepository: CheckInRepository) {}

  async execute(dto: GetCheckInHistoryDTO): Promise<CheckInDTO[]> {
    const checkIns = await this.checkInRepository.findByUserId(dto.userId);
    return CheckInMapper.toDTOList(checkIns);
  }
}
