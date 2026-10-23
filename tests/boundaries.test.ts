import { it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
afterEach(() => vi.unstubAllEnvs());
it("returns an HTTP 404 for test routes in production even if the test flag is set", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ZION_E2E", "1");
  const response = await proxy(
    new NextRequest("http://localhost/testing/product"),
  );
  expect(response.status).toBe(404);
});

it("redirects protected admin pages before streaming when no backend is configured", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  const response = await proxy(
    new NextRequest("http://localhost/admin/produtos"),
  );
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("http://localhost/admin/login");
});
