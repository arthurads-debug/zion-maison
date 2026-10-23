import { test, expect } from "@playwright/test";
test("homepage presents the reels area even before videos are published", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Zion in Motion", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Novas histórias em movimento. Em breve, por aqui."),
  ).toBeVisible();
});
test("reels use 9:16, loop silently, allow pausing and horizontal navigation", async ({
  page,
}) => {
  await page.goto("/testing/reels");
  const region = page.getByRole("region", { name: "Zion in Motion" });
  await region.scrollIntoViewIfNeeded();
  const cards = region.locator(".motion-card");
  await expect(cards).toHaveCount(5);
  const video = cards.first().locator("video");
  await expect
    .poll(() =>
      video.evaluate((v) => ({
        loop: (v as HTMLVideoElement).loop,
        muted: (v as HTMLVideoElement).muted,
        inline: (v as HTMLVideoElement).playsInline,
      })),
    )
    .toEqual({ loop: true, muted: true, inline: true });
  const ratio = await cards
    .first()
    .evaluate(
      (el) =>
        el.getBoundingClientRect().width / el.getBoundingClientRect().height,
    );
  expect(ratio).toBeCloseTo(9 / 16, 2);
  await expect(
    cards.first().getByRole("button", { name: "Pausar vídeo" }),
  ).toBeVisible();
  await cards.first().getByRole("button", { name: "Pausar vídeo" }).click();
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused))
    .toBe(true);
  await region.getByRole("button", { name: "Próximos vídeos" }).click();
  await expect
    .poll(() => region.locator(".reels-track").evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(10);
  await expect(
    cards.nth(1).getByRole("button", { name: "Pausar vídeo" }),
  ).toBeVisible();
  await region.getByRole("button", { name: "Vídeos anteriores" }).click();
  await expect
    .poll(() => region.locator(".reels-track").evaluate((el) => el.scrollLeft))
    .toBeLessThan(2);
  await expect(
    cards.first().getByRole("button", { name: "Reproduzir vídeo" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("reduced motion keeps reels paused until the visitor starts playback", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/testing/reels");
  const first = page
    .getByRole("region", { name: "Zion in Motion" })
    .locator(".motion-card")
    .first();
  await first.scrollIntoViewIfNeeded();
  await expect(
    first.getByRole("button", { name: "Reproduzir vídeo" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      first.locator("video").evaluate((v) => (v as HTMLVideoElement).paused),
    )
    .toBe(true);
  await first.getByRole("button", { name: "Reproduzir vídeo" }).click();
  await expect(
    first.getByRole("button", { name: "Pausar vídeo" }),
  ).toBeVisible();
});
