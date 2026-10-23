import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/components/admin/**/*.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
  globalIgnores([
    ".next/**",
    ".next-e2e/**",
    ".superpowers/**",
    ".agents/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
