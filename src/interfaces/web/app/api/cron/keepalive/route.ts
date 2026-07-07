import { NextRequest, NextResponse } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { toErrorResponse } from "../../../../http/errorResponse";

export const dynamic = "force-dynamic";

/** Non-existent user id used only to issue a real read query against Supabase. */
const KEEPALIVE_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Pinged on a schedule (see vercel.json) so the query keeps the free-tier
 * Supabase project from auto-pausing after a week of inactivity. Issues a
 * real read through the existing use case rather than a raw infra call.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
  }

  try {
    const { listGoalsUseCase } = getContainer();
    await listGoalsUseCase.execute({ userId: KEEPALIVE_USER_ID });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
