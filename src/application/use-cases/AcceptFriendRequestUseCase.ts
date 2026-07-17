import { FriendshipRepository } from "@/domain/repositories/FriendshipRepository";
import { UsernameRepository } from "@/domain/repositories/UsernameRepository";
import { FriendshipNotFoundError } from "../errors/ApplicationError";
import { RespondFriendRequestDTO, FriendshipDTO } from "../dtos/FriendshipDTO";
import { Clock } from "../ports/Clock";
import { toFriendshipDTO } from "../mappers/friendshipDtoHelpers";

/** Use Case: the addressee accepts a pending friend request. */
export class AcceptFriendRequestUseCase {
  constructor(
    private readonly friendshipRepository: FriendshipRepository,
    private readonly usernameRepository: UsernameRepository,
    private readonly clock: Clock,
  ) {}

  async execute(dto: RespondFriendRequestDTO): Promise<FriendshipDTO> {
    const friendship = await this.friendshipRepository.findById(dto.friendshipId);
    if (!friendship || friendship.addresseeId !== dto.userId) {
      throw new FriendshipNotFoundError();
    }

    friendship.accept(this.clock.now());
    await this.friendshipRepository.save(friendship);

    const usernames = await this.usernameRepository.findUsernamesByUserIds([
      friendship.requesterId,
      friendship.addresseeId,
    ]);
    return toFriendshipDTO(
      friendship,
      new Map([...usernames].map(([id, u]) => [id, u.toString()])),
    );
  }
}
