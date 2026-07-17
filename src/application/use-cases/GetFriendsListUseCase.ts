import { FriendshipRepository } from "@/domain/repositories/FriendshipRepository";
import { UsernameRepository } from "@/domain/repositories/UsernameRepository";
import { FriendSummaryDTO } from "../dtos/FriendshipDTO";

export interface GetFriendsListDTO {
  userId: string;
}

/** Use Case: this user's accepted friends, each resolved to a display username. */
export class GetFriendsListUseCase {
  constructor(
    private readonly friendshipRepository: FriendshipRepository,
    private readonly usernameRepository: UsernameRepository,
  ) {}

  async execute(dto: GetFriendsListDTO): Promise<FriendSummaryDTO[]> {
    const friendships = await this.friendshipRepository.findAccepted(dto.userId);
    const otherIds = friendships.map((f) => f.otherUserId(dto.userId));
    const usernames = await this.usernameRepository.findUsernamesByUserIds(otherIds);

    return friendships.map((f) => {
      const otherId = f.otherUserId(dto.userId);
      return {
        friendshipId: f.id,
        userId: otherId,
        username: usernames.get(otherId)?.toString() ?? "unknown",
      };
    });
  }
}
