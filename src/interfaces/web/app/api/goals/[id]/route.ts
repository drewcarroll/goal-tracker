import { NextRequest, NextResponse } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { updateGoalSchema } from "../../../../http/validation";
import { toErrorResponse } from "../../../../http/errorResponse";
import { unauthorizedResponse } from "../../../../http/auth";

/**
 * Route handler (interface adapter) for /api/goals/:id.
 *
 * Thin: authenticate -> validate input -> call use case -> serialize output.
 * The goal id comes from the path; the owner from the session. The update use
 * case rejects goals the caller does not own (surfaces as GOAL_NOT_FOUND).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { authService, updateGoalUseCase } = getContainer();
    const userId = await authService.getCurrentUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const parsed = updateGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
        { status: 400 },
      );
    }

    const goal = await updateGoalUseCase.execute({
      userId,
      goalId: params.id,
      name: parsed.data.name,
      targetValue: parsed.data.targetValue,
      unit: parsed.data.unit,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    });

    return NextResponse.json({ data: goal });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { authService, deleteGoalUseCase } = getContainer();
    const userId = await authService.getCurrentUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    await deleteGoalUseCase.execute({ userId, goalId: params.id });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
