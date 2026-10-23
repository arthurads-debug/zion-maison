import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createHmac } from "node:crypto";
import { HttpError } from "./auth";
import { serviceDatabase } from "./supabase";
export function assertOrigin(req: Request) {
  const actual = new URL(req.url).origin;
  const expected = new URL(process.env.NEXT_PUBLIC_SITE_URL || actual).origin;
  if (req.headers.get("origin") !== expected)
    throw new HttpError(403, "Origem da operação inválida.");
}
export async function jsonBody(req: Request, maxBytes = 131072) {
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Envie dados JSON.");
  const text = await req.text();
  if (Buffer.byteLength(text) > maxBytes)
    throw new HttpError(413, "Conteúdo excede o limite.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "JSON inválido.");
  }
}
export async function rateLimit(
  req: NextRequest,
  scope: string,
  limit = 60,
  seconds = 60,
) {
  const ip =
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    "unknown";
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!salt) throw new HttpError(503, "Serviço ainda não configurado.");
  const key = createHmac("sha256", salt).update(`${scope}:${ip}`).digest("hex");
  const { data, error } = await serviceDatabase().rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_seconds: seconds,
  });
  if (error) throw new HttpError(503, "Tente novamente em instantes.");
  if (!data) throw new HttpError(429, "Muitas tentativas. Aguarde um momento.");
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      { status: 400 },
    );
  // Database internals, URLs, tokens and provider responses are never returned.
  const raw = error instanceof Error ? error.message : "";
  if (/stock|estoque|unavailable|version conflict|idempotency/i.test(raw))
    return NextResponse.json(
      {
        error:
          "A disponibilidade ou os dados mudaram. Atualize e tente novamente.",
      },
      { status: 409 },
    );
  if (/not configured|não configurado|ainda não configurad/i.test(raw))
    return NextResponse.json(
      { error: "Serviço ainda não configurado. Consulte a administração." },
      { status: 503 },
    );
  return NextResponse.json(
    {
      error:
        "Não foi possível concluir a operação. Revise os dados e tente novamente.",
    },
    { status: 400 },
  );
}
