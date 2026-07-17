import type { SupabaseClient } from "@supabase/supabase-js";
import { UsernameRepository } from "@/domain/repositories/UsernameRepository";
import { Username } from "@/domain/value-objects/Username";

const USERNAMES_TABLE = "usernames";

interface UsernameRow {
  user_id: string;
  username: string;
}

/**
 * Supabase implementation of the UsernameRepository port — the registry
 * that lets a friend request resolve "bob" to a userId, and every
 * friend-facing display resolve a userId back to "bob".
 */
export class SupabaseUsernameRepository implements UsernameRepository {
  constructor(private readonly client: SupabaseClient) {}

  async register(userId: string, username: Username): Promise<void> {
    const { error } = await this.client.from(USERNAMES_TABLE).upsert(
      { user_id: userId, username: username.toString() },
      { onConflict: "user_id" },
    );
    if (error) {
      throw new Error(`Failed to register username for user "${userId}": ${error.message}`);
    }
  }

  async findUserIdByUsername(username: Username): Promise<string | null> {
    const { data, error } = await this.client
      .from(USERNAMES_TABLE)
      .select("user_id")
      .eq("username", username.toString())
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to look up username: ${error.message}`);
    }
    return (data as { user_id: string } | null)?.user_id ?? null;
  }

  async findUsernameByUserId(userId: string): Promise<Username | null> {
    const { data, error } = await this.client
      .from(USERNAMES_TABLE)
      .select("username")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to look up username for user "${userId}": ${error.message}`);
    }
    const row = data as { username: string } | null;
    return row ? Username.create(row.username) : null;
  }

  async findUsernamesByUserIds(userIds: readonly string[]): Promise<Map<string, Username>> {
    if (userIds.length === 0) return new Map();

    const { data, error } = await this.client
      .from(USERNAMES_TABLE)
      .select("*")
      .in("user_id", [...userIds]);

    if (error) {
      throw new Error(`Failed to look up usernames: ${error.message}`);
    }
    return new Map(
      (data as UsernameRow[]).map((row) => [row.user_id, Username.create(row.username)]),
    );
  }
}
