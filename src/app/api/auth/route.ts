import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { database, checkDb } from "@/server/supabase";
import {
  assertOrigin,
  errorResponse,
  jsonBody,
  rateLimit,
} from "@/server/http";
import { requireAdmin, HttpError } from "@/server/auth";
export async function POST(req: NextRequest) {
  try {
    assertOrigin(req);
    await rateLimit(req, "auth", 12, 600);
    const body = await jsonBody(req, 8192);
    const db = await database();
    if (body.action === "logout") {
      const { error } = await db.auth.signOut();
      checkDb(error);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "recover") {
      const email = z.email().parse(body.email);
      await db.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin}/auth/callback?next=/admin/redefinir`,
      });
      return NextResponse.json({
        message:
          "Se este e-mail tiver acesso, você receberá as instruções de recuperação.",
      });
    }
    if (body.action === "reset") {
      await requireAdmin();
      const password = z.string().min(12).max(128).parse(body.password);
      const { error } = await db.auth.updateUser({ password });
      checkDb(error);
      return NextResponse.json({ ok: true });
    }
    const input = z
      .object({ email: z.email(), password: z.string().min(1).max(128) })
      .parse(body);
    const { error } = await db.auth.signInWithPassword(input);
    if (error) throw new HttpError(401, "E-mail ou senha inválidos.");
    try {
      await requireAdmin();
    } catch {
      await db.auth.signOut();
      throw new HttpError(403, "Esta conta não tem acesso à administração.");
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
