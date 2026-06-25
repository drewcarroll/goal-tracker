import { NextRequest, NextResponse } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { updateProgressSchema } from "../../../../../http/validation";
import { toErrorResponse } from "../../../../../http/errorResponse";

/**
 * Route handler for PATCH /api/goals/:id/progress.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = updateProgressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
        { status: 400 },
      );
    }

    const { updateGoalProgressUseCase } = getContainer();
    const goal = await updateGoalProgressUseCase.execute({
      goalId: params.id,
      progress: parsed.data.progress,
    });

    return NextResponse.json({ data: goal });
  } catch (error) {
    return toErrorResponse(error);
  }
}
