export async function GET() {
  if (process.env.NODE_ENV === "production" || process.env.ZION_E2E !== "1")
    return new Response(null, { status: 404 });
  return new Response(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#e9dfcf"/><path d="M200 200L140 260L90 500L180 520L210 360L190 700H410L390 360L420 520L510 500L460 260L400 200L350 240H250Z" fill="#a9bdc4"/><text x="300" y="760" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#6a4936">EXEMPLO · NÃO É UM PRODUTO REAL</text></svg>',
    {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
    },
  );
}
