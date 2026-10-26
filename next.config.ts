import type { NextConfig } from "next";
import { realpathSync } from "node:fs";
import { relative } from "node:path";
// Explicit assets must use their physical path: pnpm package directories are
// symlinks, which Vercel cannot package when included as ordinary directories.
const mediaInfoWasm = relative(
  process.cwd(),
  realpathSync("./node_modules/mediainfo.js/dist/MediaInfoModule.wasm"),
).replaceAll("\\", "/");
const nextConfig: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.ZION_E2E === "1" ? ".next-e2e" : ".next",
  serverExternalPackages: ["sharp", "mediainfo.js"],
  outputFileTracingIncludes: {
    "/api/admin/media-upload": [mediaInfoWasm],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "http", hostname: "127.0.0.1", port: "54321" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default nextConfig;
