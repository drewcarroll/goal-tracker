import { Friendship } from "@/domain/entities/Friendship";
import { Username } from "@/domain/value-objects/Username";
import { FriendshipRepository } from "@/domain/repositories/FriendshipRepository";
import { UsernameRepository } from "@/domain/repositories/UsernameRepository";
import { UserNotFoundError, FriendRequestAlreadyExistsError } from "../errors/ApplicationError";
import { SendFriendRequestDTO, FriendshipDTO } from "../dtos/FriendshipDTO";
import { IdGenerator } from "../ports/IdGenerator";
import { Clock } from "../ports/Clock";
import { toFriendshipDTO } from "../mappers/friendshipDtoHelpers";

/**
 * Use Case: send a friend request by typing a username. Resolves the
 * target via the username registry (there is no other way to find a user
 * in this app — see docs/plan.md Phase 11); rejects a target that has never
 * logged in, self-requests, and duplicate open requests either direction.
 */
export class SendFriendRequestUseCase {
  constructor(
    private readonly friendshipRepository: FriendshipRepository,
    private readonly usernameRepository: UsernameRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(dto: SendFriendRequestDTO): Promise<FriendshipDTO> {
    const targetUsername = Username.create(dto.targetUsername);
    const targetUserId = await this.usernameRepository.findUserIdByUsername(targetUsername);
    if (!targetUserId) {
      throw new UserNotFoundError(dto.targetUsername);
    }

    const existing = await this.friendshipRepository.findBetween(dto.userId, targetUserId);
    if (existing) {
      throw new FriendRequestAlreadyExistsError();
    }

    const friendship = Friendship.request({
      id: this.idGenerator.generate(),
      requesterId: dto.userId,
      addresseeId: targetUserId,
      now: this.clock.now(),
    });
    await this.friendshipRepository.save(friendship);

    const usernames = await this.usernameRepository.findUsernamesByUserIds([
      dto.userId,
      targetUserId,
    ]);
    return toFriendshipDTO(
      friendship,
      new Map([...usernames].map(([id, u]) => [id, u.toString()])),
    );
  }
}
