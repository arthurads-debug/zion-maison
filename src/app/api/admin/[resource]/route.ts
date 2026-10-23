import { NextRequest, NextResponse } from "next/server";
import { listAdmin, mutateAdmin } from "@/server/admin";
import {
  assertOrigin,
  errorResponse,
  jsonBody,
  rateLimit,
} from "@/server/http";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  try {
    return NextResponse.json(
      await listAdmin((await params).resource, req.nextUrl.searchParams),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
async function write(
  req: NextRequest,
  context: { params: Promise<{ resource: string }> },
) {
  try {
    assertOrigin(req);
    const { resource } = await context.params;
    await rateLimit(req, `admin-${resource}`, 120, 60);
    return NextResponse.json(
      await mutateAdmin(resource, await jsonBody(req), req.method),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export const POST = write;
export const PUT = write;
export const DELETE = write;
