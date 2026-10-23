import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { errorResponse } from "@/server/http";
import { checkDb } from "@/server/supabase";
import { periodRange, type Report } from "@/lib/report";
import { csv } from "@/lib/security";
import { z } from "zod";
export async function GET(req: NextRequest) {
  try {
    const { db } = await requireAdmin("reports.read");
    const p = req.nextUrl.searchParams;
    const range = periodRange(
      p.get("period") || "30",
      p.get("from") || undefined,
      p.get("to") || undefined,
    );
    const ids = p.get("products")
      ? z.array(z.uuid()).max(50).parse(p.get("products")!.split(","))
      : null;
    const { data, error } = await db.rpc("dashboard_report", {
      p_from: range.from,
      p_to: range.to,
      p_products: ids,
    });
    checkDb(error);
    if (p.get("format") === "csv") {
      const report = data as Report;
      return new NextResponse(
        csv([
          [
            "Produto",
            "Visualizações",
            "Sessões únicas",
            "WhatsApp",
            "Carrinho",
            "Favoritos",
          ],
          ...report.products.map((p) => [
            p.name,
            p.views,
            p.unique_views,
            p.clicks,
            p.cart,
            p.favorites,
          ]),
        ]),
        {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="zion-relatorio.csv"',
          },
        },
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    return errorResponse(e);
  }
}
