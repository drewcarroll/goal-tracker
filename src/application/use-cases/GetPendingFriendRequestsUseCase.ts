import { FriendshipRepository } from "@/domain/repositories/FriendshipRepository";
import { UsernameRepository } from "@/domain/repositories/UsernameRepository";
import { PendingFriendRequestsDTO } from "../dtos/FriendshipDTO";
import { toFriendshipDTO } from "../mappers/friendshipDtoHelpers";

export interface GetPendingFriendRequestsDTO {
  userId: string;
}

/** Use Case: friend requests waiting on this user (incoming) and requests they're waiting on (outgoing). */
export class GetPendingFriendRequestsUseCase {
  constructor(
    private readonly friendshipRepository: FriendshipRepository,
    private readonly usernameRepository: UsernameRepository,
  ) {}

  async execute(dto: GetPendingFriendRequestsDTO): Promise<PendingFriendRequestsDTO> {
    const [incoming, outgoing] = await Promise.all([
      this.friendshipRepository.findPendingIncoming(dto.userId),
      this.friendshipRepository.findPendingOutgoing(dto.userId),
    ]);

    const otherIds = [
      ...incoming.map((f) => f.otherUserId(dto.userId)),
      ...outgoing.map((f) => f.otherUserId(dto.userId)),
    ];
    const usernames = await this.usernameRepository.findUsernamesByUserIds(otherIds);
    const asStrings = new Map([...usernames].map(([id, u]) => [id, u.toString()]));

    return {
      incoming: incoming.map((f) => toFriendshipDTO(f, asStrings)),
      outgoing: outgoing.map((f) => toFriendshipDTO(f, asStrings)),
    };
  }
}
