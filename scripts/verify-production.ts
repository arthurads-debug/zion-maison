import { request, chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const baseURL = process.env.SMOKE_URL || "http://127.0.0.1:3000";
const api = await request.newContext({ baseURL });
try {
  for (const [path, status] of [
    ["/", 200],
    ["/catalogo", 200],
    ["/testing/product", 404],
    ["/testing/asset", 404],
    ["/api/jobs", 401],
    ["/admin/produtos", 307],
  ] as const) {
    const response = await api.get(path, { maxRedirects: 0 });
    if (response.status() !== status)
      throw new Error(
        `${path}: HTTP ${response.status()}, esperado ${status}.`,
      );
    console.log(path, status);
  }
} finally {
  await api.dispose();
}
await mkdir("docs/screenshots", { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["tablet", 820, 1180],
    ["mobile", 390, 844],
  ] as const) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(baseURL);
    const essentials = page.getByRole("button", {
      name: "Somente essenciais",
      exact: true,
    });
    if (await essentials.isVisible()) {await essentials.click();await essentials.waitFor({state:"hidden"});}
    await page
      .getByRole("heading", { name: "Elegância que acompanha você." })
      .waitFor();
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw new Error(`Overflow: ${name}`);
    await page.screenshot({ path: `docs/screenshots/home-${name}.png` });
    console.log("captura e largura:", name);
    await page.close();
  }
} finally {
  await browser.close();
}
