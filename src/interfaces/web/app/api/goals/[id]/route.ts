import { NextRequest, NextResponse } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { updateGoalSchema } from "../../../../http/validation";
import { toErrorResponse } from "../../../../http/errorResponse";

/**
 * Route handler (interface adapter) for /api/goals/:id.
 *
 * Thin: validate input -> call use case -> serialize output. The goal id comes
 * from the path; the owner from the composition root (single-user). Access is
 * gated by the shared-password middleware.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { ownerId, updateGoalUseCase } = getContainer();

    const body = await request.json();
    const parsed = updateGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
        { status: 400 },
      );
    }

    const goal = await updateGoalUseCase.execute({
      userId: ownerId,
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
    const { ownerId, deleteGoalUseCase } = getContainer();
    await deleteGoalUseCase.execute({ userId: ownerId, goalId: params.id });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
