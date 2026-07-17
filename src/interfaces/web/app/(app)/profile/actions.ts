"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import { THEME_COOKIE, isValidColorTheme } from "@/interfaces/web/http/session";

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

/**
 * Sets the color-theme preset. Presentation-only, so it's a plain cookie
 * (like the username/timezone cookies) rather than a UserSettings/DB field —
 * no business logic ever reads it, only the root layout's data-theme attribute.
 */
export async function setThemeAction(themeId: string): Promise<void> {
  if (!isValidColorTheme(themeId)) return;
  cookies().set(THEME_COOKIE, themeId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}

function toErrorMessage(error: unknown): string {
  const coded = error as { code?: string; message?: string };
  if (coded?.code === "VALIDATION_ERROR" || coded?.code === "TOO_MANY_PINNED_TRINKETS") {
    return coded.message ?? "That couldn't be saved.";
  }
  return "Something went wrong. Please try again.";
}

export type SetPinnedTrinketsActionResult = { ok: true } | { ok: false; error: string };

/** Choose which owned trinkets to showcase (Profile > Collection). */
export async function setPinnedTrinketsAction(
  trinketIds: string[],
): Promise<SetPinnedTrinketsActionResult> {
  const { setPinnedTrinketsUseCase } = getContainer();
  try {
    await setPinnedTrinketsUseCase.execute({ userId: currentUserId(), trinketIds });
    revalidatePath("/profile");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
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

/** Adapts recomputeAllGoalsAction's {recomputed} success shape to the generic {ok} panel action shape. */
export async function recomputeAllGoalsPanelAction(): Promise<ProfileActionResult> {
  const result = await recomputeAllGoalsAction();
  return result.ok ? { ok: true } : result;
}

/** Every page that reads coin balance or shop/battle-pass state — economy constants rewrite them all. */
function revalidateEconomyDerivedPages(): void {
  revalidatePath("/profile");
  revalidatePath("/home");
  revalidatePath("/trinkets");
}

export async function saveEconomyAction(
  config: Record<string, unknown>,
): Promise<ProfileActionResult> {
  if (!(await isDevModeUnlocked())) {
    return { ok: false, error: "Dev mode is locked." };
  }
  const { updateEconomyConfigUseCase } = getContainer();
  try {
    await updateEconomyConfigUseCase.execute({ config });
    revalidateEconomyDerivedPages();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function resetEconomyAction(): Promise<ProfileActionResult> {
  if (!(await isDevModeUnlocked())) {
    return { ok: false, error: "Dev mode is locked." };
  }
  const { resetEconomyConfigUseCase } = getContainer();
  try {
    await resetEconomyConfigUseCase.execute();
    revalidateEconomyDerivedPages();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
