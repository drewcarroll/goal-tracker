import { FriendshipRepository } from "@/domain/repositories/FriendshipRepository";
import { UsernameRepository } from "@/domain/repositories/UsernameRepository";
import { ActivityEventRepository } from "@/domain/repositories/ActivityEventRepository";
import { getTrinketById } from "@/domain/value-objects/TrinketCatalog";
import type { ActivityFeedItemDTO } from "../dtos/TrinketCollectionDTO";

export interface GetActivityFeedDTO {
  userId: string;
  limit?: number;
}

const DEFAULT_LIMIT = 30;

/**
 * Use Case: recent battle-pass claims and shop purchases from this user's
 * accepted friends — never their own events, and never anyone who isn't an
 * accepted friend (the friendship gate, same as every other friend-data
 * read in this app).
 */
export class GetActivityFeedUseCase {
  constructor(
    private readonly friendshipRepository: FriendshipRepository,
    private readonly usernameRepository: UsernameRepository,
    private readonly activityEventRepository: ActivityEventRepository,
  ) {}

  async execute(dto: GetActivityFeedDTO): Promise<ActivityFeedItemDTO[]> {
    const friendships = await this.friendshipRepository.findAccepted(dto.userId);
    const friendIds = friendships.map((f) => f.otherUserId(dto.userId));
    if (friendIds.length === 0) return [];

    const [events, usernames] = await Promise.all([
      this.activityEventRepository.findForUsers(friendIds, dto.limit ?? DEFAULT_LIMIT),
      this.usernameRepository.findUsernamesByUserIds(friendIds),
    ]);

    return events.map((event) => {
      const trinket = event.trinketId ? getTrinketById(event.trinketId) : undefined;
      return {
        userId: event.userId,
        username: usernames.get(event.userId)?.toString() ?? "Someone",
        type: event.type,
        trinket: trinket ? { id: trinket.id, emoji: trinket.emoji, name: trinket.name } : undefined,
        coins: event.coins,
        occurredAt: event.occurredAt.toISOString(),
      };
    });
  }
}
