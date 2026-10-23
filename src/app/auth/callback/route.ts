import { NextRequest, NextResponse } from "next/server";
import { database } from "@/server/supabase";
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next =
    req.nextUrl.searchParams.get("next") === "/admin/redefinir"
      ? "/admin/redefinir"
      : "/admin";
  if (code) {
    const db = await database();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(next, process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin),
      );
  }
  return NextResponse.redirect(
    new URL("/admin/login?error=link", req.nextUrl.origin),
  );
}
