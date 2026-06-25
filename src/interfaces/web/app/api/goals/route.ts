import { NextRequest, NextResponse } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { createGoalSchema, userIdQuerySchema } from "../../../http/validation";
import { toErrorResponse } from "../../../http/errorResponse";

/**
 * Route handler (interface adapter) for /api/goals.
 *
 * Thin: validate input -> call use case -> serialize output.
 * No business logic. Use cases are pre-wired in the composition root.
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

    const { listGoalsUseCase } = getContainer();
    const goals = await listGoalsUseCase.execute({ userId: parsed.data.userId });
    return NextResponse.json({ data: goals });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = createGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
        { status: 400 },
      );
    }

    const { createGoalUseCase } = getContainer();
    const goal = await createGoalUseCase.execute({
      userId: parsed.data.userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      dueDate: parsed.data.dueDate ?? null,
    });

    return NextResponse.json({ data: goal }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
