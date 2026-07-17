"use server";

import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import type { FriendshipDTO } from "@/application/dtos/FriendshipDTO";

function toErrorMessage(error: unknown): string {
  const coded = error as { code?: string; message?: string };
  if (
    coded?.code === "VALIDATION_ERROR" ||
    coded?.code === "USER_NOT_FOUND" ||
    coded?.code === "FRIEND_REQUEST_ALREADY_EXISTS" ||
    coded?.code === "FRIENDSHIP_NOT_FOUND"
  ) {
    return coded.message ?? "That couldn't be done.";
  }
  return "Something went wrong. Please try again.";
}

function revalidateFriendsPages(): void {
  revalidatePath("/friends");
}

export type SendFriendRequestResult =
  | { ok: true; friendship: FriendshipDTO }
  | { ok: false; error: string };

export async function sendFriendRequestAction(
  targetUsername: string,
): Promise<SendFriendRequestResult> {
  const { sendFriendRequestUseCase } = getContainer();
  const userId = currentUserId();

  try {
    const friendship = await sendFriendRequestUseCase.execute({ userId, targetUsername });
    revalidateFriendsPages();
    return { ok: true, friendship };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export type FriendRequestActionResult = { ok: true } | { ok: false; error: string };

export async function acceptFriendRequestAction(
  friendshipId: string,
): Promise<FriendRequestActionResult> {
  const { acceptFriendRequestUseCase } = getContainer();
  const userId = currentUserId();

  try {
    await acceptFriendRequestUseCase.execute({ userId, friendshipId });
    revalidateFriendsPages();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function declineFriendRequestAction(
  friendshipId: string,
): Promise<FriendRequestActionResult> {
  const { declineFriendRequestUseCase } = getContainer();
  const userId = currentUserId();

  try {
    await declineFriendRequestUseCase.execute({ userId, friendshipId });
    revalidateFriendsPages();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function cancelFriendRequestAction(
  friendshipId: string,
): Promise<FriendRequestActionResult> {
  const { cancelFriendRequestUseCase } = getContainer();
  const userId = currentUserId();

  try {
    await cancelFriendRequestUseCase.execute({ userId, friendshipId });
    revalidateFriendsPages();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
