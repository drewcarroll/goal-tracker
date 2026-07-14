import { CheckInWindowResolver, ResolvedCheckInWindow } from "../services/CheckInWindowResolver";

export interface GetCheckInWindowDTO {
  userId: string;
  /** IANA timezone, e.g. "America/Denver". */
  timezone: string;
}

/**
 * Use Case: whether the nightly check-in is open right now for this user,
 * and for which logical day. Drives /checkin's gating UI; the same resolver
 * is enforced server-side inside SubmitCheckInUseCase, so the UI state and
 * the submission rule can never disagree.
 */
export class GetCheckInWindowUseCase {
  constructor(private readonly windowResolver: CheckInWindowResolver) {}

  async execute(dto: GetCheckInWindowDTO): Promise<ResolvedCheckInWindow> {
    return this.windowResolver.resolve(dto.userId, dto.timezone);
  }
}
