import { NextRequest, NextResponse } from "next/server";
import { database } from "@/server/supabase";
export async function GET(req: NextRequest) {
  const token_hash = req.nextUrl.searchParams.get("token_hash");
  const type = req.nextUrl.searchParams.get("type");
  if (
    token_hash &&
    (type === "invite" || type === "recovery" || type === "email")
  ) {
    const db = await database();
    const { error } = await db.auth.verifyOtp({ token_hash, type });
    if (!error)
      return NextResponse.redirect(
        new URL(
          type === "invite" || type === "recovery"
            ? "/admin/redefinir"
            : "/admin",
          process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin,
        ),
      );
  }
  return NextResponse.redirect(
    new URL("/admin/login?error=link", req.nextUrl.origin),
  );
}
