import { Friendship } from "../entities/Friendship";

export interface FriendshipRepository {
  findById(id: string): Promise<Friendship | null>;
  /** Any pending or accepted friendship between the two, in either direction — for duplicate-prevention. */
  findBetween(userIdA: string, userIdB: string): Promise<Friendship | null>;
  /** Accepted friendships involving this user, either direction. */
  findAccepted(userId: string): Promise<Friendship[]>;
  /** Pending requests sent TO this user. */
  findPendingIncoming(userId: string): Promise<Friendship[]>;
  /** Pending requests this user sent. */
  findPendingOutgoing(userId: string): Promise<Friendship[]>;
  save(friendship: Friendship): Promise<void>;
}
