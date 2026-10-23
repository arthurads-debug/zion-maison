import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/server/auth";
import {
  assertOrigin,
  errorResponse,
  jsonBody,
  rateLimit,
} from "@/server/http";
import {
  getIntegration,
  maskedIntegration,
  saveIntegration,
  testIntegration,
} from "@/server/integrations";
import { serviceDatabase, checkDb } from "@/server/supabase";
const providerSchema = z.enum(["meta", "analytics", "pushcut", "whatsapp"]);
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { user } = await requireAdmin("integrations.write");
    const provider = providerSchema.parse((await params).provider);
    const config = maskedIntegration(await getIntegration(provider, user.id));
    const { data, error } = await serviceDatabase().rpc("delivery_jobs", {
      p_action: "logs",
    });
    checkDb(error);
    return NextResponse.json({
      ...config,
      logs: (data || []).filter(
        (d: { provider: string }) => d.provider === provider,
      ),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    assertOrigin(req);
    const { user } = await requireAdmin("integrations.write");
    await rateLimit(req, "integration", 20, 60);
    const provider = providerSchema.parse((await params).provider);
    const body = await jsonBody(req, 16384);
    if (body.action === "test")
      return NextResponse.json(await testIntegration(provider, user.id));
    if (body.action === "retry") {
      const id = z.uuid().parse(body.id);
      const { error } = await serviceDatabase().rpc("delivery_jobs", {
        p_action: "retry",
        p_id: id,
      });
      checkDb(error);
      await serviceDatabase().from("audit_log").insert({
        actor_id: user.id,
        entity: "integrations",
        entity_id: provider,
        operation: "RETRY",
      });
      return NextResponse.json({ saved: true });
    }
    return NextResponse.json(await saveIntegration(provider, user.id, body));
  } catch (e) {
    return errorResponse(e);
  }
}
