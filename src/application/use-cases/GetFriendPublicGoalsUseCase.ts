import { GoalPrivacyService } from "@/domain/services/GoalPrivacyService";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { FriendshipRepository } from "@/domain/repositories/FriendshipRepository";
import { NotFriendsError } from "../errors/ApplicationError";
import { GetFriendDataDTO } from "../dtos/FriendshipDTO";
import { GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";

/**
 * Use Case: a friend's PUBLIC goals only. Requires an accepted friendship —
 * an unaccepted/nonexistent friendship is rejected the same way regardless
 * of whether the target user even exists, so a probe can't distinguish
 * "not your friend" from "no such user."
 */
export class GetFriendPublicGoalsUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly friendshipRepository: FriendshipRepository,
    private readonly goalPrivacyService: GoalPrivacyService,
  ) {}

  async execute(dto: GetFriendDataDTO): Promise<GoalDTO[]> {
    const friendship = await this.friendshipRepository.findBetween(dto.userId, dto.friendUserId);
    if (!friendship || friendship.status !== "accepted") {
      throw new NotFriendsError();
    }

    const goals = await this.goalRepository.findByUserId(dto.friendUserId);
    return GoalMapper.toDTOList(this.goalPrivacyService.filterPublicGoals(goals));
  }
}
