import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, HttpError } from "@/server/auth";
import { allowed } from "@/lib/domain";
import {
  assertOrigin,
  errorResponse,
  jsonBody,
  rateLimit,
} from "@/server/http";
import { serviceDatabase, checkDb } from "@/server/supabase";
import { finalizeMedia } from "@/server/media";
export async function POST(req: NextRequest) {
  try {
    assertOrigin(req);
    const { user, profile } = await requireAdmin();
    if (
      !allowed(profile, "products.write") &&
      !allowed(profile, "content.write")
    )
      throw new HttpError(403, "Sem permissão para enviar mídias.");
    await rateLimit(req, "upload", 40, 60);
    const body = await jsonBody(req);
    const mime = z
      .enum([
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/webm",
      ])
      .parse(body.mime);
    if (body.action === "sign") {
      const size = z
        .number()
        .int()
        .positive()
        .max(mime.startsWith("image/") ? 20971520 : 104857600)
        .parse(body.size);
      void size;
      const path = `${user.id}/${crypto.randomUUID()}`;
      const db = serviceDatabase();
      const { data, error } = await db.storage
        .from("originals")
        .createSignedUploadUrl(path);
      checkDb(error);
      return NextResponse.json({ path, signedUrl: data!.signedUrl });
    }
    const path = z.string().max(200).parse(body.path);
    const transform = z
      .object({
        rotate: z.number().int().multipleOf(90).min(-270).max(270).optional(),
        crop: z
          .object({
            left: z.number().int().min(0),
            top: z.number().int().min(0),
            width: z.number().int().positive(),
            height: z.number().int().positive(),
          })
          .optional(),
      })
      .parse(body.transform || {});
    return NextResponse.json({
      asset: await finalizeMedia(
        path,
        mime,
        user.id,
        z
          .string()
          .max(300)
          .parse(body.alt || ""),
        transform,
      ),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
