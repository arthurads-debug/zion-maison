import { NextResponse } from "next/server";
import { configured, database } from "@/server/supabase";
export async function GET() {
  if (!configured()) return NextResponse.json({ providers: [] });
  const db = await database();
  const { data } = await db
    .from("integration_status")
    .select("provider,public_config")
    .eq("enabled", true)
    .in("provider", ["meta", "analytics"]);
  return NextResponse.json({ providers: data || [] });
}
