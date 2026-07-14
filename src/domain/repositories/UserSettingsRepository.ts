import { CheckInWindowTimes } from "../services/CheckInWindowService";

export interface UserSettings {
  userId: string;
  checkInWindow: CheckInWindowTimes;
}

/**
 * Per-user settings. Implementations return DEFAULT_CHECKIN_WINDOW when the
 * user has no stored row, so callers never deal with a missing window.
 */
export interface UserSettingsRepository {
  findByUserId(userId: string): Promise<UserSettings>;
  save(settings: UserSettings): Promise<void>;
}
