import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, HttpError } from "@/server/auth";
import { allowed } from "@/lib/domain";
import { assertOrigin, errorResponse, jsonBody } from "@/server/http";
import { serviceDatabase, checkDb } from "@/server/supabase";
import { processDeliveries } from "@/server/integrations";
import { z } from "zod";
async function authorize() {
  const auth = await requireAdmin();
  if (
    !allowed(auth.profile, "products.write") &&
    !allowed(auth.profile, "content.write")
  )
    throw new HttpError(403, "Sem permissão para mídias.");
  return auth;
}
export async function GET() {
  try {
    await authorize();
    const { data, error } = await serviceDatabase().rpc("delivery_jobs", {
      p_action: "logs",
    });
    checkDb(error);
    return NextResponse.json({
      jobs: (data || []).filter(
        (r: { provider: string }) => r.provider === "storage",
      ),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    assertOrigin(req);
    const { user } = await authorize();
    const { id } = z.object({ id: z.uuid() }).parse(await jsonBody(req));
    const db = serviceDatabase();
    const { data: logs, error } = await db.rpc("delivery_jobs", {
      p_action: "logs",
    });
    checkDb(error);
    if (
      !(logs || []).some(
        (r: { provider: string; id: string }) =>
          r.provider === "storage" && r.id === id,
      )
    )
      throw new HttpError(404, "Tarefa não encontrada.");
    await db.rpc("delivery_jobs", { p_action: "retry", p_id: id });
    const result = await processDeliveries({ storageOnly: true });
    await db.from("audit_log").insert({
      actor_id: user.id,
      entity: "media_cleanup",
      entity_id: id,
      operation: "RETRY",
    });
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
