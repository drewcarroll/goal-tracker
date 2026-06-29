import { NextRequest, NextResponse } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import { createGoalSchema } from "../../../http/validation";
import { toErrorResponse } from "../../../http/errorResponse";

/**
 * Route handler (interface adapter) for /api/goals.
 *
 * Thin: validate input -> call use case -> serialize output. No business logic.
 * Single-user: the owner id comes from the composition root, never from request
 * input. Access is gated by the shared-password middleware.
 */

export async function GET(): Promise<NextResponse> {
  try {
    const { listGoalsUseCase } = getContainer();
    const userId = currentUserId();
    const goals = await listGoalsUseCase.execute({ userId });
    return NextResponse.json({ data: goals });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { createGoalUseCase } = getContainer();
    const userId = currentUserId();

    const body = await request.json();
    const parsed = createGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
        { status: 400 },
      );
    }

    const goal = await createGoalUseCase.execute({
      userId,
      name: parsed.data.name,
      weeklyTarget: parsed.data.weeklyTarget,
      unit: parsed.data.unit,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    });

    return NextResponse.json({ data: goal }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
