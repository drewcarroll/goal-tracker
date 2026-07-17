import { GoalPrivacyService } from "@/domain/services/GoalPrivacyService";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { FriendshipRepository } from "@/domain/repositories/FriendshipRepository";
import { NotFriendsError } from "../errors/ApplicationError";
import { GetFriendDataDTO } from "../dtos/FriendshipDTO";
import { CheckInDTO } from "../dtos/CheckInDTO";

/**
 * Use Case: a friend's day-by-day check-in log, with every private goal's
 * mark removed. `dayResult` is recomputed from the REMAINING public marks
 * only — never reused from the stored check-in — because that field is
 * derived from ALL of that day's marks (including private ones), and
 * passing it through unfiltered would leak whether a private goal failed
 * even though the mark itself was stripped. A day with zero public marks
 * left after filtering is dropped entirely, indistinguishable from a day
 * with no plan at all (docs/plan.md Phase 11).
 */
export class GetFriendCheckInLogUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly checkInRepository: CheckInRepository,
    private readonly friendshipRepository: FriendshipRepository,
    private readonly goalPrivacyService: GoalPrivacyService,
  ) {}

  async execute(dto: GetFriendDataDTO): Promise<CheckInDTO[]> {
    const friendship = await this.friendshipRepository.findBetween(dto.userId, dto.friendUserId);
    if (!friendship || friendship.status !== "accepted") {
      throw new NotFriendsError();
    }

    const [goals, checkIns] = await Promise.all([
      this.goalRepository.findByUserId(dto.friendUserId),
      this.checkInRepository.findByUserId(dto.friendUserId),
    ]);
    const publicGoalIds = new Set(
      this.goalPrivacyService.filterPublicGoals(goals).map((g) => g.id),
    );

    const filtered: CheckInDTO[] = [];
    for (const checkIn of checkIns) {
      const publicMarks = this.goalPrivacyService.filterPublicMarks(
        checkIn.marks,
        publicGoalIds,
      );
      if (publicMarks.length === 0) continue;

      filtered.push({
        id: checkIn.id,
        userId: checkIn.userId,
        date: checkIn.date.toString(),
        marks: publicMarks.map((mark) => ({ ...mark })),
        dayResult: publicMarks.every((mark) => mark.passed) ? "PASS" : "FAIL",
        submittedOnTime: checkIn.submittedOnTime,
        createdAt: checkIn.createdAt.toISOString(),
      });
    }
    return filtered;
  }
}
