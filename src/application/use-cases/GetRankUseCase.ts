import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { RankService, XP_PER_LOG } from "@/domain/services/RankService";
import { GetRankDTO, RankDTO } from "../dtos/RankDTO";

/**
 * Use Case: the user's rank progression. XP comes only from check-ins
 * originally submitted within the nightly window (submittedOnTime), never
 * from passing goals, never from backfilled days (docs/progression.md §2).
 * Computed from rows, not stored, so deleting a check-in naturally removes
 * its XP.
 */
export class GetRankUseCase {
  private static readonly rankService = new RankService();

  constructor(private readonly checkInRepository: CheckInRepository) {}

  async execute(dto: GetRankDTO): Promise<RankDTO> {
    const checkIns = await this.checkInRepository.findByUserId(dto.userId);
    const logs = checkIns.filter((checkIn) => checkIn.submittedOnTime).length;
    const progress = GetRankUseCase.rankService.progressFor(logs);
    return {
      rank: progress.rank,
      nextRank: progress.rank + 1,
      xp: progress.xp,
      xpIntoRank: progress.xpIntoRank,
      xpForRankUp: progress.xpForRankUp,
      xpPerLog: XP_PER_LOG,
    };
  }
}
