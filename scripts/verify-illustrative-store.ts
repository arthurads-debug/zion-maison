/** Read-only acceptance check against the populated local production instance. */
import { chromium, request, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const baseURL = process.env.SMOKE_URL || "http://127.0.0.1:3000";
const manifest = JSON.parse(
  await readFile("assets/illustrative/published.json", "utf8"),
);
const api = await request.newContext({ baseURL });
try {
  const response = await api.get("/api/catalog");
  expect(response.status()).toBe(200);
  const catalog = await response.json();
  expect(catalog.products.length).toBeGreaterThanOrEqual(6);
  for (const asset of Object.values(manifest.assets) as { url: string }[])
    expect((await api.head(asset.url)).status()).toBe(200);
  console.log("Catálogo preenchido e dez URLs de mídia acessíveis.");
} finally {
  await api.dispose();
}
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
  ] as const) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: "no-preference",
    });
    await page.goto(baseURL);
    await expect(
      page.getByRole("heading", { name: "Elegância que acompanha você." }),
    ).toBeVisible();
    const consent = page.getByRole("button", {
      name: "Somente essenciais",
      exact: true,
    });
    if (await consent.isVisible()) await consent.click();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.allSettled(
        document
          .getAnimations()
          .filter((a) => a.effect?.getTiming().iterations !== Infinity)
          .map((a) => a.finished),
      );
    });
    await page.screenshot({
      path: `docs/screenshots/illustrative-hero-${name}.png`,
    });
    const sections = await page
      .locator("main .section, main .maison-story")
      .all();
    for (const section of sections) {
      await section.scrollIntoViewIfNeeded();
    }
    await expect
      .poll(
        () =>
          page
            .locator("main img")
            .evaluateAll(
              (images) =>
                images.filter(
                  (image) =>
                    !(image as HTMLImageElement).complete ||
                    !(image as HTMLImageElement).naturalWidth,
                ).length,
            ),
        { timeout: 20000 },
      )
      .toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const products = page.locator(".picks-section");
    await products.scrollIntoViewIfNeeded();
    await expect(products.locator(".product-card")).toHaveCount(4);
    await page.screenshot({
      path: `docs/screenshots/illustrative-products-${name}.png`,
    });
    const reels = page.getByRole("region", {
      name: "Zion in Motion",
      exact: true,
    });
    await reels.scrollIntoViewIfNeeded();
    await expect(reels.locator("video")).toHaveCount(3);
    await expect
      .poll(() =>
        reels
          .locator("video")
          .first()
          .evaluate((video) => (video as HTMLVideoElement).videoWidth),
      )
      .toBe(1080);
    await expect
      .poll(() =>
        reels
          .locator("video")
          .first()
          .evaluate((video) => (video as HTMLVideoElement).currentTime),
      )
      .toBeGreaterThan(0);
    await page.screenshot({
      path: `docs/screenshots/illustrative-reels-${name}.png`,
    });
    await page.goto(`${baseURL}/produto/${manifest.products[0].slug}`);
    await expect(
      page.getByRole("button", { name: "Peça ilustrativa", exact: true }),
    ).toBeDisabled();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    expect(
      await page.locator('script[type="application/ld+json"]').count(),
    ).toBe(0);
    console.log(
      `Loja, imagens, Reels 1080×1920 e produto ilustrativo: ${name}.`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
