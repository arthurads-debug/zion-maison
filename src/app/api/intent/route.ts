import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { selectionSchema } from "@/lib/domain";
import { buildWhatsAppMessage, whatsappUrl } from "@/lib/whatsapp";
import {
  assertOrigin,
  errorResponse,
  jsonBody,
  rateLimit,
} from "@/server/http";
import { serviceDatabase, checkDb } from "@/server/supabase";
import { getSettings } from "@/server/catalog";
const input = z.object({
  key: z.uuid(),
  name: z.string().trim().min(1).max(120),
  items: selectionSchema,
  source: z.string().max(300).default("/"),
});
export async function POST(req: NextRequest) {
  try {
    assertOrigin(req);
    await rateLimit(req, "intent", 12, 60);
    const body = input.parse(await jsonBody(req));
    for (const i of body.items) z.uuid().parse(i.variant_id);
    const settings = await getSettings();
    whatsappUrl(settings.whatsapp, "");
    const { data, error } = await serviceDatabase().rpc("create_intent", {
      p_key: body.key,
      p_name: body.name,
      p_items: body.items,
      p_source: body.source.split("?")[0],
    });
    checkDb(error);
    const message = buildWhatsAppMessage(
      body.name,
      data.items,
      process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin,
    );
    return NextResponse.json({
      id: body.key,
      items: data.items,
      total_cents: data.total_cents,
      message,
      url: whatsappUrl(settings.whatsapp, message),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
