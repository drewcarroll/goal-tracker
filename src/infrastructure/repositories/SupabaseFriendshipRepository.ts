import type { SupabaseClient } from "@supabase/supabase-js";
import { Friendship, type FriendshipStatus } from "@/domain/entities/Friendship";
import { FriendshipRepository } from "@/domain/repositories/FriendshipRepository";

const FRIENDSHIPS_TABLE = "friendships";

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  responded_at: string | null;
}

export class SupabaseFriendshipRepository implements FriendshipRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Friendship | null> {
    const { data, error } = await this.client
      .from(FRIENDSHIPS_TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch friendship "${id}": ${error.message}`);
    }
    return data ? this.toDomain(data as FriendshipRow) : null;
  }

  async findBetween(userIdA: string, userIdB: string): Promise<Friendship | null> {
    const { data, error } = await this.client
      .from(FRIENDSHIPS_TABLE)
      .select("*")
      .in("status", ["pending", "accepted"])
      .or(
        `and(requester_id.eq.${userIdA},addressee_id.eq.${userIdB}),and(requester_id.eq.${userIdB},addressee_id.eq.${userIdA})`,
      )
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to look up friendship: ${error.message}`);
    }
    return data ? this.toDomain(data as FriendshipRow) : null;
  }

  async findAccepted(userId: string): Promise<Friendship[]> {
    const { data, error } = await this.client
      .from(FRIENDSHIPS_TABLE)
      .select("*")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (error) {
      throw new Error(`Failed to fetch friends for user "${userId}": ${error.message}`);
    }
    return (data as FriendshipRow[]).map((row) => this.toDomain(row));
  }

  async findPendingIncoming(userId: string): Promise<Friendship[]> {
    const { data, error } = await this.client
      .from(FRIENDSHIPS_TABLE)
      .select("*")
      .eq("status", "pending")
      .eq("addressee_id", userId);

    if (error) {
      throw new Error(`Failed to fetch incoming requests for user "${userId}": ${error.message}`);
    }
    return (data as FriendshipRow[]).map((row) => this.toDomain(row));
  }

  async findPendingOutgoing(userId: string): Promise<Friendship[]> {
    const { data, error } = await this.client
      .from(FRIENDSHIPS_TABLE)
      .select("*")
      .eq("status", "pending")
      .eq("requester_id", userId);

    if (error) {
      throw new Error(`Failed to fetch outgoing requests for user "${userId}": ${error.message}`);
    }
    return (data as FriendshipRow[]).map((row) => this.toDomain(row));
  }

  async save(friendship: Friendship): Promise<void> {
    const { error } = await this.client.from(FRIENDSHIPS_TABLE).upsert(
      {
        id: friendship.id,
        requester_id: friendship.requesterId,
        addressee_id: friendship.addresseeId,
        status: friendship.status,
        created_at: friendship.createdAt.toISOString(),
        responded_at: friendship.respondedAt?.toISOString() ?? null,
      },
      { onConflict: "id" },
    );
    if (error) {
      throw new Error(`Failed to save friendship "${friendship.id}": ${error.message}`);
    }
  }

  private toDomain(row: FriendshipRow): Friendship {
    return Friendship.rehydrate({
      id: row.id,
      requesterId: row.requester_id,
      addresseeId: row.addressee_id,
      status: row.status,
      createdAt: new Date(row.created_at),
      respondedAt: row.responded_at ? new Date(row.responded_at) : null,
    });
  }
}
