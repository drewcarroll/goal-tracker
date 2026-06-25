import { NextRequest, NextResponse } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { createGoalSchema } from "../../../http/validation";
import { toErrorResponse } from "../../../http/errorResponse";
import { unauthorizedResponse } from "../../../http/auth";

/**
 * Route handler (interface adapter) for /api/goals.
 *
 * Thin: authenticate -> validate input -> call use case -> serialize output.
 * No business logic. The caller's identity is taken from the session, never
 * from request input, so a user can only ever see/create their own goals.
 */

export async function GET(): Promise<NextResponse> {
  try {
    const { authService, listGoalsUseCase } = getContainer();
    const userId = await authService.getCurrentUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const goals = await listGoalsUseCase.execute({ userId });
    return NextResponse.json({ data: goals });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { authService, createGoalUseCase } = getContainer();
    const userId = await authService.getCurrentUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

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
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      dueDate: parsed.data.dueDate ?? null,
    });

    return NextResponse.json({ data: goal }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
