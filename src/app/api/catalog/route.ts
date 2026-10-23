import { NextRequest, NextResponse } from "next/server";
import { getProducts, productsForVariants } from "@/server/catalog";
import { errorResponse } from "@/server/http";
import { z } from "zod";
export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    if (params.variants) {
      const ids = z.array(z.uuid()).max(100).parse(params.variants.split(","));
      return NextResponse.json({ products: await productsForVariants(ids) });
    }
    return NextResponse.json(
      await getProducts({
        ...params,
        ids: params.ids
          ? z.array(z.uuid()).max(100).parse(params.ids.split(","))
          : undefined,
      }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
