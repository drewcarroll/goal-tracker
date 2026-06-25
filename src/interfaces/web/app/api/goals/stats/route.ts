import { NextRequest, NextResponse } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { userIdQuerySchema } from "../../../../http/validation";
import { toErrorResponse } from "../../../../http/errorResponse";

/**
 * Route handler for GET /api/goals/stats?userId=...
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const parsed = userIdQuerySchema.safeParse({
      userId: request.nextUrl.searchParams.get("userId"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
        { status: 400 },
      );
    }

    const { getGoalStatsUseCase } = getContainer();
    const stats = await getGoalStatsUseCase.execute({ userId: parsed.data.userId });
    return NextResponse.json({ data: stats });
  } catch (error) {
    return toErrorResponse(error);
  }
}
