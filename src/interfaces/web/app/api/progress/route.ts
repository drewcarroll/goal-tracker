import { NextResponse } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { toErrorResponse } from "../../../http/errorResponse";

/**
 * Route handler (interface adapter) for /api/progress.
 *
 * Thin: call use case -> serialize output. No business logic. Single-user: the
 * owner id comes from the composition root. Access is gated by the shared-
 * password middleware.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const { ownerId, getProgressDataUseCase } = getContainer();
    const progress = await getProgressDataUseCase.execute({ userId: ownerId });
    return NextResponse.json({ data: progress });
  } catch (error) {
    return toErrorResponse(error);
  }
}
