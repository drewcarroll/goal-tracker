import { FriendshipRepository } from "@/domain/repositories/FriendshipRepository";
import { FriendshipNotFoundError } from "../errors/ApplicationError";
import { RespondFriendRequestDTO } from "../dtos/FriendshipDTO";
import { Clock } from "../ports/Clock";

/** Use Case: the addressee declines a pending friend request. */
export class DeclineFriendRequestUseCase {
  constructor(
    private readonly friendshipRepository: FriendshipRepository,
    private readonly clock: Clock,
  ) {}

  async execute(dto: RespondFriendRequestDTO): Promise<void> {
    const friendship = await this.friendshipRepository.findById(dto.friendshipId);
    if (!friendship || friendship.addresseeId !== dto.userId) {
      throw new FriendshipNotFoundError();
    }
    friendship.decline(this.clock.now());
    await this.friendshipRepository.save(friendship);
  }
}
