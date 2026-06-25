import { NextResponse } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { toErrorResponse } from "../../../../http/errorResponse";
import { unauthorizedResponse } from "../../../../http/auth";

/**
 * Route handler for GET /api/goals/stats.
 * Stats are always computed over the authenticated user's own goals.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const { authService, getGoalStatsUseCase } = getContainer();
    const userId = await authService.getCurrentUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const stats = await getGoalStatsUseCase.execute({ userId });
    return NextResponse.json({ data: stats });
  } catch (error) {
    return toErrorResponse(error);
  }
}
