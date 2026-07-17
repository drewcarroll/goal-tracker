import { Friendship } from "@/domain/entities/Friendship";
import { FriendshipDTO } from "../dtos/FriendshipDTO";

/**
 * Builds a FriendshipDTO from an entity plus a resolved userId->username
 * map. Not a static Mapper class (the project's usual pattern) because
 * resolving usernames requires a repository call the use case already made
 * — this just assembles the DTO from what the caller already has.
 */
export function toFriendshipDTO(
  friendship: Friendship,
  usernames: ReadonlyMap<string, string>,
): FriendshipDTO {
  return {
    id: friendship.id,
    requesterId: friendship.requesterId,
    requesterUsername: usernames.get(friendship.requesterId) ?? "unknown",
    addresseeId: friendship.addresseeId,
    addresseeUsername: usernames.get(friendship.addresseeId) ?? "unknown",
    status: friendship.status,
    createdAt: friendship.createdAt.toISOString(),
    respondedAt: friendship.respondedAt?.toISOString() ?? null,
  };
}
