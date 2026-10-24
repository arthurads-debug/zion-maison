import { test, expect } from "@playwright/test";
test("public boutique, catalog empty state and responsive navigation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Elegância que acompanha você." }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Explorar coleção", exact: true })
    .click();
  await expect(page).toHaveURL(/catalogo/);
  await expect(page.getByText("Nenhuma peça encontrada")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("consent can be refused and revisited", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Somente essenciais" }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("zion-consent") || "{}").analytics,
    ),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Preferências de privacidade" })
    .click();
  await expect(
    page.getByRole("button", { name: "Somente essenciais" }),
  ).toBeVisible();
});
test("admin cannot be accessed without authentication", async ({
  page,
  request,
}) => {
  await page.goto("/admin/produtos");
  await expect(page).toHaveURL(/admin\/login/);
  const response = await request.get("/api/admin/products");
  expect([401, 503]).toContain(response.status());
});
test("favorites and selection have useful empty states", async ({ page }) => {
  await page.goto("/favoritos");
  await expect(
    page.getByText("Suas peças favoritas, reunidas aqui."),
  ).toBeVisible();
  await page.goto("/minha-selecao");
  await expect(
    page.getByRole("heading", {
      name: "Sua seleção começa com uma descoberta.",
    }),
  ).toBeVisible();
});

test("cross-tab consent revokes identifiers and stops events, then permits events again", async ({
  page,
  context,
}) => {
  let count = 0;
  await context.route("**/api/events", async (route) => {
    count++;
    await route.fulfill({ json: { ok: true } });
  });
  await context.route("**/api/tracking-config", (route) =>
    route.fulfill({ json: { providers: [] } }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Permitir estatísticas", exact: true })
    .click();
  await expect.poll(() => count).toBeGreaterThan(0);
  const second = await context.newPage();
  await second.goto("/");
  await expect.poll(() => count).toBeGreaterThan(1);
  await page
    .getByRole("button", { name: "Preferências de privacidade", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Somente essenciais", exact: true })
    .click();
  await expect
    .poll(() => second.evaluate(() => localStorage.getItem("zion-visitor")))
    .toBeNull();
  const stopped = count;
  await second.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("zion-event", {
        detail: { type: "search", data: { query: "denied" } },
      }),
    ),
  );
  await expect.poll(() => count).toBe(stopped);
  await second
    .getByRole("button", { name: "Preferências de privacidade", exact: true })
    .click();
  await second
    .getByRole("button", { name: "Permitir estatísticas", exact: true })
    .click();
  await expect.poll(() => count).toBeGreaterThan(stopped);
  await second.close();
});

test("editorial motion respects reduced motion and preserves readable content", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const title = page.getByRole("heading", {
    name: "Elegância que acompanha você.",
  });
  await expect(title).toBeVisible();
  expect(await title.evaluate((el) => getComputedStyle(el).animationName)).toBe(
    "none",
  );
  expect(
    await title.evaluate(
      (el) =>
        parseFloat(getComputedStyle(el).lineHeight) /
        parseFloat(getComputedStyle(el).fontSize),
    ),
  ).toBeGreaterThan(1.1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Explorar coleção", exact: true })
    .click();
  await expect(page).toHaveURL(/catalogo/);
});
