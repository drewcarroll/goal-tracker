"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";

/**
 * Dev-mode gate. This is a personal app: the password is a tripwire against
 * casual fiddling, not security (the real boundary is the username cookie).
 * The cookie is httpOnly + session-scoped, checked server-side by every
 * config-mutating action below.
 */
const DEV_PASSWORD = "drew";
const DEV_COOKIE = "gt_dev";

export async function isDevModeUnlocked(): Promise<boolean> {
  return cookies().get(DEV_COOKIE)?.value === "1";
}

function toErrorMessage(error: unknown): string {
  const coded = error as { code?: string; message?: string };
  if (coded?.code === "VALIDATION_ERROR") {
    return coded.message ?? "That couldn't be saved.";
  }
  return "Something went wrong. Please try again.";
}

export type ProfileActionResult = { ok: true } | { ok: false; error: string };

export async function updateCheckInWindowAction(
  start: string,
  end: string,
): Promise<ProfileActionResult> {
  const { updateUserSettingsUseCase } = getContainer();
  try {
    await updateUserSettingsUseCase.execute({
      userId: currentUserId(),
      checkInWindow: { start, end },
    });
    revalidatePath("/profile");
    revalidatePath("/checkin");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function unlockDevModeAction(password: string): Promise<ProfileActionResult> {
  if (password !== DEV_PASSWORD) {
    return { ok: false, error: "Wrong password." };
  }
  cookies().set(DEV_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/profile");
  return { ok: true };
}

export async function lockDevModeAction(): Promise<ProfileActionResult> {
  cookies().delete(DEV_COOKIE);
  revalidatePath("/profile");
  return { ok: true };
}

/** Every page that shows a cost or trajectory — constants rewrite them all. */
function revalidateCostDerivedPages(): void {
  revalidatePath("/profile");
  revalidatePath("/progress");
  revalidatePath("/plan");
  revalidatePath("/home");
  revalidatePath("/goals");
}

export async function saveLockFormulaAction(
  // Shape validation happens in the use case (lockFormulaConfigFrom) — the
  // action just forwards whatever the dev panel built.
  config: Record<string, unknown>,
): Promise<ProfileActionResult> {
  if (!(await isDevModeUnlocked())) {
    return { ok: false, error: "Dev mode is locked." };
  }
  const { updateLockFormulaConfigUseCase } = getContainer();
  try {
    await updateLockFormulaConfigUseCase.execute({ config });
    revalidateCostDerivedPages();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function resetLockFormulaAction(): Promise<ProfileActionResult> {
  if (!(await isDevModeUnlocked())) {
    return { ok: false, error: "Dev mode is locked." };
  }
  const { resetLockFormulaConfigUseCase } = getContainer();
  try {
    await resetLockFormulaConfigUseCase.execute();
    revalidateCostDerivedPages();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export type RecomputeActionResult =
  | { ok: true; recomputed: number }
  | { ok: false; error: string };

export async function recomputeAllGoalsAction(): Promise<RecomputeActionResult> {
  if (!(await isDevModeUnlocked())) {
    return { ok: false, error: "Dev mode is locked." };
  }
  const { recomputeAllGoalsUseCase } = getContainer();
  try {
    const result = await recomputeAllGoalsUseCase.execute({ userId: currentUserId() });
    revalidateCostDerivedPages();
    return { ok: true, recomputed: result.recomputed };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
