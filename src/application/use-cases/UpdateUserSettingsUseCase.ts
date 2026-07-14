import { UserSettingsRepository } from "@/domain/repositories/UserSettingsRepository";
import { CheckInWindowService } from "@/domain/services/CheckInWindowService";
import { UserSettingsDTO } from "./GetUserSettingsUseCase";

export interface UpdateUserSettingsDTO {
  userId: string;
  checkInWindow: { start: string; end: string };
}

/**
 * Use Case: change the nightly check-in window ("as late as 7 AM, as early
 * as 2 PM"). The domain's window validation (end < 12:00 ≤ start) keeps the
 * logical-day mapping unambiguous. Changing the window never rewrites past
 * rank points — on-time status was stamped at each submission.
 */
export class UpdateUserSettingsUseCase {
  constructor(private readonly userSettingsRepository: UserSettingsRepository) {}

  async execute(dto: UpdateUserSettingsDTO): Promise<UserSettingsDTO> {
    CheckInWindowService.assertValidWindow(dto.checkInWindow);
    await this.userSettingsRepository.save({
      userId: dto.userId,
      checkInWindow: { ...dto.checkInWindow },
    });
    return { checkInWindow: { ...dto.checkInWindow } };
  }
}
