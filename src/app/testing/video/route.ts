import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
export async function GET() {
  if (process.env.NODE_ENV === "production" || process.env.ZION_E2E !== "1")
    return new Response(null, { status: 404 });
  const bytes = await readFile(
    resolve(process.cwd(), "tests/fixtures/sample.webm"),
  );
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "video/webm", "Cache-Control": "no-store" },
  });
}
