import { NextResponse } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { toErrorResponse } from "../../../http/errorResponse";
import { unauthorizedResponse } from "../../../http/auth";

/**
 * Route handler (interface adapter) for /api/progress.
 *
 * Thin: authenticate -> call use case -> serialize output. No business logic.
 * The caller's identity is taken from the session, never from request input,
 * so a user only ever sees progress data for their own goals.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const { authService, getProgressDataUseCase } = getContainer();
    const userId = await authService.getCurrentUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const progress = await getProgressDataUseCase.execute({ userId });
    return NextResponse.json({ data: progress });
  } catch (error) {
    return toErrorResponse(error);
  }
}
