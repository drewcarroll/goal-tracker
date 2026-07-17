import type { FriendshipStatus } from "@/domain/entities/Friendship";

// Re-exported so interfaces/ never needs to import domain/ directly for this type.
export type { FriendshipStatus };

export interface FriendshipDTO {
  id: string;
  requesterId: string;
  requesterUsername: string;
  addresseeId: string;
  addresseeUsername: string;
  status: FriendshipStatus;
  createdAt: string; // ISO 8601
  respondedAt: string | null; // ISO 8601
}

/** One row in a friends list — the friendship plus the OTHER person's identity. */
export interface FriendSummaryDTO {
  friendshipId: string;
  userId: string;
  username: string;
}

export interface PendingFriendRequestsDTO {
  incoming: FriendshipDTO[];
  outgoing: FriendshipDTO[];
}

export interface SendFriendRequestDTO {
  userId: string;
  targetUsername: string;
}

export interface RespondFriendRequestDTO {
  userId: string;
  friendshipId: string;
}

export interface GetFriendDataDTO {
  userId: string;
  friendUserId: string;
}
