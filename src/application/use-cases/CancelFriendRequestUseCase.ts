import { FriendshipRepository } from "@/domain/repositories/FriendshipRepository";
import { FriendshipNotFoundError } from "../errors/ApplicationError";
import { RespondFriendRequestDTO } from "../dtos/FriendshipDTO";
import { Clock } from "../ports/Clock";

/** Use Case: the requester withdraws their own still-pending friend request. */
export class CancelFriendRequestUseCase {
  constructor(
    private readonly friendshipRepository: FriendshipRepository,
    private readonly clock: Clock,
  ) {}

  async execute(dto: RespondFriendRequestDTO): Promise<void> {
    const friendship = await this.friendshipRepository.findById(dto.friendshipId);
    if (!friendship || friendship.requesterId !== dto.userId) {
      throw new FriendshipNotFoundError();
    }
    friendship.cancel(this.clock.now());
    await this.friendshipRepository.save(friendship);
  }
}
