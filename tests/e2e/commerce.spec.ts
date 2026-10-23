import { test, expect } from "@playwright/test";
import { fixtureProduct, fixtureReport } from "../fixtures/catalog";
test("selects available variant, adds selection and persists favorites", async ({
  page,
}) => {
  await page.goto("/testing/product");
  await expect(
    page.getByRole("button", { name: "Adicionar à minha seleção" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "M Esgotado", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "P", exact: true }).click();
  await page.getByRole("button", { name: "Adicionar à minha seleção" }).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("zion-selection-v1") || "{}").lines[0]
          .quantity,
    ),
  ).toBe(1);
  await page.getByRole("button", { name: "Salvar nos favoritos" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Salvo nos favoritos" }),
  ).toBeVisible();
});
test("cart updates quantities, prepares encoded WhatsApp and removes items", async ({
  page,
}) => {
  await page.route("**/api/catalog?variants=*", (route) =>
    route.fulfill({ json: { products: [fixtureProduct] } }),
  );
  await page.route("**/api/intent", async (route) => {
    const input = route.request().postDataJSON();
    expect(input.name).toBe("Luísa");
    expect(input.items[0].quantity).toBe(2);
    const message =
      "Olá Luísa! Peça demonstrativa — Azul / P · 2 unidades · R$ 859,80";
    await route.fulfill({
      json: {
        items: [],
        total_cents: 85980,
        message,
        url: `https://wa.me/5591999999999?text=${encodeURIComponent(message)}`,
      },
    });
  });
  await page.goto("/testing/product");
  await page.getByRole("button", { name: "P", exact: true }).click();
  await page.getByRole("button", { name: "Adicionar à minha seleção" }).click();
  await page.goto("/testing/cart");
  await expect(
    page.getByText(fixtureProduct.name, { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Aumentar quantidade" }).click();
  await page.getByPlaceholder("Seu nome").fill("Luísa");
  await page.getByRole("button", { name: "Preparar atendimento" }).click();
  const href = await page
    .getByRole("link", { name: "Continuar no WhatsApp" })
    .getAttribute("href");
  expect(new URL(href!).searchParams.get("text")).toContain("Luísa");
  await page
    .getByRole("button", { name: `Remover ${fixtureProduct.name}` })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Sua seleção começa com uma descoberta.",
    }),
  ).toBeVisible();
});
test("product form sends operation contract and supports preview", async ({
  page,
}) => {
  await page.route("**/api/admin/taxonomy*", (route) =>
    route.fulfill({ json: { data: [], count: 0 } }),
  );
  let saved = false;
  await page.route("**/api/admin/products", async (route) => {
    const data = route.request().postDataJSON();
    expect(data.product.name).toBe("Nome editado no teste");
    expect(data.product.price_cents).toBe(42990);
    saved = true;
    await route.fulfill({ json: { id: fixtureProduct.id } });
  });
  await page.goto("/testing/editor");
  await page
    .getByLabel("Nome da peça", { exact: true })
    .fill("Nome editado no teste");
  await page.getByRole("button", { name: "Prévia", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Nome editado no teste" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fechar prévia" }).click();
  await page.getByRole("button", { name: "Salvar produto" }).click();
  await expect.poll(() => saved).toBe(true);
});
test("admin dashboard is responsive with isolated empty fixtures", async ({
  page,
}) => {
  await page.route("**/api/admin/report?*", (route) =>
    route.fulfill({ json: fixtureReport }),
  );
  await page.goto("/testing/admin");
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Nenhum evento registrado neste período."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("media editor immediately updates crop and rotation preview and sends the same transform", async ({
  page,
}) => {
  await page.route("**/api/admin/media?*", (route) =>
    route.fulfill({ json: { data: [], count: 0 } }),
  );
  await page.route("**/api/admin/media-cleanup", (route) =>
    route.fulfill({ json: { jobs: [] } }),
  );
  await page.route("**/testing-upload", (route) =>
    route.fulfill({ status: 200 }),
  );
  let transform:
    { rotate: number; crop: { width: number; height: number } } | undefined;
  await page.route("**/api/admin/media-upload", async (route) => {
    const input = route.request().postDataJSON();
    if (input.action === "sign")
      await route.fulfill({
        json: {
          signedUrl: "http://127.0.0.1:3100/testing-upload",
          path: "test",
        },
      });
    else {
      transform = input.transform;
      await route.fulfill({ json: { asset: { id: "test" } } });
    }
  });
  await page.goto("/testing/media");
  await page
    .locator("input[type=file]")
    .setInputFiles("tests/fixtures/sample.png");
  const canvas = page.getByLabel("Prévia do enquadramento");
  await expect(canvas).toHaveAttribute("width", "120");
  await expect(canvas).toHaveAttribute("height", "200");
  await page
    .getByRole("combobox", { name: "Proporção", exact: true })
    .selectOption("0.75");
  await expect(canvas).toHaveAttribute("height", "160");
  await page.getByRole("button", { name: "Girar 90°" }).click();
  await expect(canvas).toHaveAttribute("width", "90");
  await expect(canvas).toHaveAttribute("height", "120");
  await page.getByRole("button", { name: "Salvar mídia verificada" }).click();
  await expect
    .poll(() => transform)
    .toEqual({
      rotate: 90,
      crop: { left: 0, top: 55, width: 120, height: 90 },
    });
});
