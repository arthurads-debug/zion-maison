import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/security";
import { serviceDatabase, checkDb } from "@/server/supabase";
import { createHash } from "node:crypto";
import { errorResponse, rateLimit } from "@/server/http";
import { z } from "zod";
export async function GET(req: NextRequest) {
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (
    !token ||
    req.nextUrl.searchParams.get("hub.mode") !== "subscribe" ||
    req.nextUrl.searchParams.get("hub.verify_token") !== token
  )
    return new NextResponse("Not configured", { status: 403 });
  return new NextResponse(req.nextUrl.searchParams.get("hub.challenge") || "");
}
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (!secret) return new NextResponse(null, { status: 503 });
    const raw = await req.text();
    if (raw.length > 262144) return new NextResponse(null, { status: 413 });
    if (!verifyWebhook(raw, req.headers.get("x-hub-signature-256"), secret))
      return new NextResponse(null, { status: 401 });
    await rateLimit(req, "whatsapp-webhook", 120, 60);
    const payload = z
      .object({
        object: z.literal("whatsapp_business_account"),
        entry: z.array(
          z
            .object({
              changes: z.array(
                z
                  .object({
                    value: z
                      .object({
                        messages: z
                          .array(
                            z
                              .object({ id: z.string().min(1).max(300) })
                              .passthrough(),
                          )
                          .optional(),
                      })
                      .passthrough(),
                  })
                  .passthrough(),
              ),
            })
            .passthrough(),
        ),
      })
      .parse(JSON.parse(raw));
    const db = serviceDatabase();
    for (const entry of payload.entry)
      for (const change of entry.changes)
        for (const message of change.value.messages || []) {
          const hash = createHash("sha256").update(message.id).digest("hex");
          const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
          const { error } = await db.from("events").upsert(
            {
              id,
              type: "whatsapp_message_received",
              data: { provider_message_ref: hash },
            },
            { onConflict: "id", ignoreDuplicates: true },
          );
          checkDb(error);
        }
    return NextResponse.json({ received: true });
  } catch (e) {
    return errorResponse(e);
  }
}
