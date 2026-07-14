import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { RankService } from "@/domain/services/RankService";
import { GetRankDTO, RankDTO } from "../dtos/RankDTO";

/**
 * Use Case: the user's rank progression. Points = count of check-ins
 * originally submitted within the nightly window (submittedOnTime) — never
 * from passing goals, never from backfilled days (docs/progression.md §2).
 * Computed from rows, not stored, so deleting a check-in naturally removes
 * its point.
 */
export class GetRankUseCase {
  private static readonly rankService = new RankService();

  constructor(private readonly checkInRepository: CheckInRepository) {}

  async execute(dto: GetRankDTO): Promise<RankDTO> {
    const checkIns = await this.checkInRepository.findByUserId(dto.userId);
    const points = checkIns.filter((checkIn) => checkIn.submittedOnTime).length;
    return {
      points,
      rank: GetRankUseCase.rankService.rankFor(points),
      nextThreshold: GetRankUseCase.rankService.nextThreshold(points),
      maxRank: GetRankUseCase.rankService.maxRank,
    };
  }
}
