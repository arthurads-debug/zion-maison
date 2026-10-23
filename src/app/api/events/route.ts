import { NextRequest, NextResponse } from "next/server";
import { eventSchema } from "@/lib/events";
import {
  assertOrigin,
  errorResponse,
  jsonBody,
  rateLimit,
} from "@/server/http";
import { serviceDatabase, checkDb } from "@/server/supabase";
export async function POST(req: NextRequest) {
  try {
    assertOrigin(req);
    let consent;
    try {
      consent = JSON.parse(req.cookies.get("zion-consent")?.value || "null");
    } catch {}
    if (
      consent?.analytics !== true ||
      typeof consent.expires !== "number" ||
      consent.expires <= Date.now()
    )
      return new NextResponse(null, { status: 204 });
    await rateLimit(req, "events", 180, 60);
    const event = eventSchema.parse(await jsonBody(req, 8192));
    const db = serviceDatabase();
    const { error } = await db.rpc("ingest_event", { p_event: event });
    checkDb(error);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
