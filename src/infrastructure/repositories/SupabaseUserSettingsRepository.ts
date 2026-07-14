import type { SupabaseClient } from "@supabase/supabase-js";
import {
  UserSettingsRepository,
  type UserSettings,
} from "@/domain/repositories/UserSettingsRepository";
import { DEFAULT_CHECKIN_WINDOW } from "@/domain/services/CheckInWindowService";

const USER_SETTINGS_TABLE = "user_settings";

/** Shape of a row in the `user_settings` table. */
interface UserSettingsRow {
  user_id: string;
  checkin_window_start: string;
  checkin_window_end: string;
}

/**
 * Supabase implementation of the UserSettingsRepository port. A user with no
 * stored row gets the default check-in window (14:00–07:00) — the row is only
 * created once they change something.
 */
export class SupabaseUserSettingsRepository implements UserSettingsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByUserId(userId: string): Promise<UserSettings> {
    const { data, error } = await this.client
      .from(USER_SETTINGS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch settings for user "${userId}": ${error.message}`);
    }
    if (!data) {
      return { userId, checkInWindow: { ...DEFAULT_CHECKIN_WINDOW } };
    }
    const row = data as UserSettingsRow;
    return {
      userId,
      checkInWindow: { start: row.checkin_window_start, end: row.checkin_window_end },
    };
  }

  async save(settings: UserSettings): Promise<void> {
    const { error } = await this.client.from(USER_SETTINGS_TABLE).upsert(
      {
        user_id: settings.userId,
        checkin_window_start: settings.checkInWindow.start,
        checkin_window_end: settings.checkInWindow.end,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      throw new Error(`Failed to save settings for user "${settings.userId}": ${error.message}`);
    }
  }
}
