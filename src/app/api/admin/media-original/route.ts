import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, HttpError } from "@/server/auth";
import { allowed } from "@/lib/domain";
import { errorResponse } from "@/server/http";
import { serviceDatabase, checkDb } from "@/server/supabase";
export async function GET(req: NextRequest) {
  try {
    const { db, profile } = await requireAdmin();
    if (
      !allowed(profile, "products.write") &&
      !allowed(profile, "content.write")
    )
      throw new HttpError(403, "Sem permissão.");
    const id = z.uuid().parse(req.nextUrl.searchParams.get("id"));
    const { data: asset, error } = await db
      .from("media_assets")
      .select("original_path,mime,alt")
      .eq("id", id)
      .single();
    checkDb(error);
    const { data, error: signedError } = await serviceDatabase()
      .storage.from("originals")
      .createSignedUrl(asset!.original_path, 60);
    checkDb(signedError);
    return NextResponse.json(
      { url: data!.signedUrl, mime: asset!.mime, alt: asset!.alt },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
