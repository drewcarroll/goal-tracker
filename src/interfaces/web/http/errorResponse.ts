import { NextResponse } from "next/server";

/**
 * Translates thrown errors into HTTP responses. Status codes are decided
 * here (interface concern) based on the error's `code`.
 */
interface CodedError {
  code?: string;
  message: string;
}

export function toErrorResponse(error: unknown): NextResponse {
  const err = error as CodedError;
  const code = err?.code ?? "INTERNAL_ERROR";

  const statusByCode: Record<string, number> = {
    VALIDATION_ERROR: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    GOAL_ALREADY_COMPLETED: 409,
    GOAL_NOT_FOUND: 404,
    LOG_NOT_FOUND: 404,
    HABIT_NOT_FOUND: 404,
    LOCK_BUDGET_EXCEEDED: 409,
    HABIT_NOT_SCHEDULABLE: 409,
    CHECK_IN_NOT_FOUND: 404,
  };

  const status = statusByCode[code] ?? 500;
  const message = status === 500 ? "Internal server error" : err.message;

  return NextResponse.json({ error: { code, message } }, { status });
}
