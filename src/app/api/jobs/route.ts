import { serviceDatabase, checkDb } from "@/server/supabase";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { processDeliveries } from "@/server/integrations";
import { errorResponse } from "@/server/http";
export const maxDuration = 300;
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  if (
    !secret ||
    Buffer.byteLength(got) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(got), Buffer.from(expected))
  )
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const result = await processDeliveries();
    const { error } = await serviceDatabase().rpc("retention_cleanup");
    checkDb(error);
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
export const POST = GET;
