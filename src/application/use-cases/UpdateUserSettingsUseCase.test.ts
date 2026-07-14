import { describe, it, expect } from "vitest";
import { UpdateUserSettingsUseCase } from "./UpdateUserSettingsUseCase";
import { GetUserSettingsUseCase } from "./GetUserSettingsUseCase";
import {
  UserSettingsRepository,
  type UserSettings,
} from "../../domain/repositories/UserSettingsRepository";
import { DEFAULT_CHECKIN_WINDOW } from "../../domain/services/CheckInWindowService";
import { ValidationError } from "../../domain/errors/DomainError";

class InMemoryUserSettingsRepository implements UserSettingsRepository {
  public stored: UserSettings | null = null;
  async findByUserId(userId: string): Promise<UserSettings> {
    return this.stored ?? { userId, checkInWindow: { ...DEFAULT_CHECKIN_WINDOW } };
  }
  async save(settings: UserSettings): Promise<void> {
    this.stored = settings;
  }
}

describe("UpdateUserSettingsUseCase / GetUserSettingsUseCase", () => {
  it("round-trips a valid window change", async () => {
    const repo = new InMemoryUserSettingsRepository();
    await new UpdateUserSettingsUseCase(repo).execute({
      userId: "user-1",
      checkInWindow: { start: "16:00", end: "05:00" },
    });

    const settings = await new GetUserSettingsUseCase(repo).execute({ userId: "user-1" });

    expect(settings.checkInWindow).toEqual({ start: "16:00", end: "05:00" });
  });

  it("returns the defaults when nothing is stored", async () => {
    const settings = await new GetUserSettingsUseCase(new InMemoryUserSettingsRepository()).execute(
      { userId: "user-1" },
    );

    expect(settings.checkInWindow).toEqual({ start: "14:00", end: "07:00" });
  });

  it("rejects an ambiguous window (start before noon / end after noon)", async () => {
    const repo = new InMemoryUserSettingsRepository();
    const useCase = new UpdateUserSettingsUseCase(repo);

    await expect(
      useCase.execute({ userId: "user-1", checkInWindow: { start: "09:00", end: "07:00" } }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      useCase.execute({ userId: "user-1", checkInWindow: { start: "14:00", end: "13:00" } }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.stored).toBeNull();
  });
});
