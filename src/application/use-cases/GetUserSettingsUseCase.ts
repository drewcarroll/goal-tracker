import { UserSettingsRepository } from "@/domain/repositories/UserSettingsRepository";

export interface UserSettingsDTO {
  checkInWindow: { start: string; end: string };
}

/**
 * Use Case: the user's settings (currently just the nightly check-in
 * window). Defaults are supplied by the repository when no row exists.
 */
export class GetUserSettingsUseCase {
  constructor(private readonly userSettingsRepository: UserSettingsRepository) {}

  async execute(dto: { userId: string }): Promise<UserSettingsDTO> {
    const settings = await this.userSettingsRepository.findByUserId(dto.userId);
    return { checkInWindow: { ...settings.checkInWindow } };
  }
}
