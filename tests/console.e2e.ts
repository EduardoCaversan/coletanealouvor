import { test, expect } from "@playwright/test";

// A tiny two-page PDF generated here, with no third-party content or binary fixture.
function pdfFixture() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 640 360] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>",
    "",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 640 360] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  for (const [index, title] of [
    [3, "PRIMEIRO SLIDE"],
    [5, "SEGUNDO SLIDE"],
  ] as const) {
    const stream = `BT /F1 36 Tf 80 180 Td (${title}) Tj ET`;
    objects[index] =
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  }
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

test("live operation, universal plan, media, recovery and private tools", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // External playback is tested physically; keep this test deterministic and verify local behavior.
  await context.route(/youtube\.com\/iframe_api/, (route) => route.abort());
  await page.goto("./");
  await expect(
    page.getByPlaceholder("Buscar hino por título ou número"),
  ).toBeVisible();
  await page.getByPlaceholder("Buscar hino por título ou número").fill("12");
  await page.getByRole("button", { name: /012.*Vinde/ }).click();
  await expect(page.getByTestId("preview-monitor")).toContainText("Vinde");
  await expect(page.getByTestId("live-monitor")).toContainText(
    "Nenhum conteúdo",
  );
  const popup = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Abrir projeção", exact: true })
    .click();
  const display = await popup;
  await display.waitForLoadState();
  await page
    .getByRole("button", { name: "Colocar no ar", exact: true })
    .click();
  await expect(page.getByTestId("live-monitor")).toContainText("Vinde");
  await page.keyboard.press("Control+k");
  await page
    .getByPlaceholder("Hino 12, mais perto, João 3:16, apresentação…")
    .fill("João 3:36");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "João 3:36 Bíblia", exact: true })
    .click();
  await expect(page.getByTestId("live-monitor")).toContainText("Vinde");
  await page
    .getByRole("button", { name: "Colocar no ar", exact: true })
    .click();
  await expect(display.locator("body")).toContainText("João 3:36");
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await expect(display.locator("body")).toContainText("João 4:1");
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  await expect(display.locator("body")).toContainText("João 3:36");
  await page.getByRole("button", { name: "Apagar tela", exact: true }).click();
  await expect(page.getByTestId("live-monitor")).toContainText("TELA APAGADA");
  await page
    .getByRole("button", { name: "Restaurar tela", exact: true })
    .click();
  await expect(display.locator("body")).toContainText("João 3:36");
  await page.getByRole("button", { name: "Mídia", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "Sermão.pdf",
      mimeType: "application/pdf",
      buffer: pdfFixture(),
    });
  await expect(page.getByTestId("preview-monitor")).toContainText(
    "Slide 1 / 2",
    { timeout: 20000 },
  );
  await expect(page.getByTestId("live-monitor")).toContainText("João 3:36");
  await page
    .getByRole("button", { name: "Colocar no ar", exact: true })
    .click();
  await expect(display.locator("img")).toHaveAttribute("src", /^blob:/);
  const first = await display.locator("img").getAttribute("src");
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await expect(page.getByTestId("live-monitor")).toContainText("Slide 2 / 2");
  await expect(display.locator("img")).not.toHaveAttribute("src", first!);
  await page
    .getByRole("button", {
      name: "+ Adicionar preparado ao roteiro",
      exact: true,
    })
    .click();
  page.once("dialog", (dialog) => dialog.accept("MICROFONE 2 — PRIVADO"));
  await page.getByRole("button", { name: "Editar nota privada" }).click();
  await expect(display.locator("body")).not.toContainText("PRIVADO");
  await page
    .getByRole("textbox", { name: "Nome da programação" })
    .fill("Culto teste");
  await page
    .getByRole("button", { name: "Salvar programação", exact: true })
    .click();
  await page.getByRole("button", { name: "Ferramentas", exact: true }).click();
  const textTool = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "Texto rápido" }) });
  await textTool.getByRole("button", { name: "Preparar", exact: true }).click();
  await expect(page.getByTestId("live-monitor")).toContainText("Slide 2 / 2");
  await page
    .getByRole("button", { name: "Colocar no ar", exact: true })
    .click();
  await expect(display.locator("body")).toContainText("Começaremos em breve.");
  const timer = page
    .locator("details")
    .filter({
      has: page.locator("summary", { hasText: "Contagem regressiva" }),
    });
  await timer.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect(display.locator("body")).not.toContainText("INÍCIO EM");
  await timer.getByRole("button", { name: "Preparar", exact: true }).click();
  await page
    .getByRole("button", { name: "Colocar no ar", exact: true })
    .click();
  await expect(display.locator("body")).toContainText("INÍCIO EM");
  await page
    .locator(".live-transport")
    .getByRole("button", { name: "Iniciar", exact: true })
    .click();
  await expect(display.locator(".stage-timer")).not.toHaveText("05:00");
  await page.locator("summary", { hasText: "Sorteio" }).click();
  const draw = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "Sorteio" }) });
  await draw.getByLabel("Quantidade").fill("5");
  await draw.getByRole("button", { name: "Sortear", exact: true }).click();
  await expect(draw.locator(".draw-results span")).toHaveCount(5);
  await draw.getByRole("button", { name: "Preparar", exact: true }).click();
  await page
    .getByRole("button", { name: "Colocar no ar", exact: true })
    .click();
  await expect(display.locator(".draw-results span")).toHaveCount(5);
  await page.reload();
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await expect(page.getByTestId("live-monitor")).toContainText("TELA APAGADA");
  await expect(page.locator(".service-panel")).toContainText("MICROFONE 2");
  await page.getByRole("button", { name: "Mídia", exact: true }).click();
  await expect(page.locator(".media-row")).toContainText("Sermão");
  await page.screenshot({ path: "test-results/console-smoke.png" });
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("button", { name: "Encerrar", exact: true }).click();
  await expect(page.getByTestId("live-monitor")).toContainText("SORTEIO");
  await page.getByRole("button", { name: "Ferramentas", exact: true }).click();
  await timer.getByRole("button", { name: "Iniciar", exact: true }).click();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Encerrar", exact: true }).click();
  await expect(page.getByTestId("live-monitor")).toContainText("Nenhum conteúdo no ar");
  await expect(page.getByTestId("preview-monitor")).toContainText("Busque ou selecione um item");
  await expect(display.locator(".content-screen, iframe")).toHaveCount(0);
  await expect(timer.getByRole("button", { name: "Iniciar", exact: true })).toBeVisible();
  await display.keyboard.press("ArrowRight");
  await expect(page.getByTestId("live-monitor")).toContainText("Nenhum conteúdo no ar");
  await page.reload();
  await expect(page.getByRole("button", { name: "Restaurar", exact: true })).toHaveCount(0);
  await expect(page.locator(".service-panel")).toContainText("MICROFONE 2");
  expect(errors).toEqual([]);
});

test("notebook layout and direct display route", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Colocar no ar", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Colocar no ar", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Apagar tela", exact: true }),
  ).toBeInViewport();
  await expect(page.getByRole("button", { name: "Encerrar", exact: true })).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/console-notebook.png" });
  await page.goto("./projecao");
  await expect(page.locator("body")).not.toContainText("BIBLIOTECA");
});

test("image sequence and storage fallback keep preparation separate from projection", async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(window, "BroadcastChannel", { value: undefined });
  });
  await page.goto("./");
  await page.getByRole("button", { name: "Mídia", exact: true }).click();
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#285580";
    ctx.fillRect(0, 0, 640, 360);
    return canvas.toDataURL().split(",")[1];
  });
  await page
    .locator("input[type=file]")
    .setInputFiles(
      ["Boas-vindas.png", "Encerramento.png"].map((name) => ({
        name,
        mimeType: "image/png",
        buffer: Buffer.from(png, "base64"),
      })),
    );
  await expect(page.getByTestId("preview-monitor")).toContainText(
    "Slide 1 / 2",
  );
  const popup = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Abrir projeção", exact: true })
    .click();
  const display = await popup;
  await display.waitForLoadState();
  await page
    .getByRole("button", { name: "Colocar no ar", exact: true })
    .click();
  await expect(display.locator("img")).toHaveAttribute("src", /^blob:/);
  await page
    .getByRole("button", { name: "Preparar slide 2", exact: true })
    .click();
  await expect(page.getByTestId("live-monitor")).toContainText("Slide 1 / 2");
  await page
    .getByRole("button", { name: "Colocar no ar", exact: true })
    .click();
  await expect(page.getByTestId("live-monitor")).toContainText("Slide 2 / 2");
  await page.reload();
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await expect(page.getByTestId("live-monitor")).toContainText("TELA APAGADA");
  await expect(page.getByTestId("preview-monitor")).toContainText(
    "Slide 2 / 2",
  );
});

test("production PWA imports a PDF offline with its cached worker and fonts", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.SMOKE_URL,
    "Run against the production preview to validate its service worker.",
  );
  await page.goto("./");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(
    page.getByPlaceholder("Buscar hino por título ou número"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /001.*Santo/ })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("button", { name: /001.*Santo/ })).toBeVisible();
  await page.getByRole("button", { name: "Mídia", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "Offline.pdf",
      mimeType: "application/pdf",
      buffer: pdfFixture(),
    });
  await expect(page.getByTestId("preview-monitor")).toContainText(
    "Slide 1 / 2",
    { timeout: 20000 },
  );
  await context.setOffline(false);
});
