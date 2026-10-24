import { expect, test, type Page } from "@playwright/test";

const TELAS = [
  { nome: "celular-pequeno", width: 360, height: 740 },
  { nome: "celular", width: 390, height: 844 },
  { nome: "tablet-em-pe", width: 768, height: 1024 },
  { nome: "tablet-deitado", width: 1024, height: 768 },
  { nome: "notebook", width: 1366, height: 768 },
  { nome: "desktop", width: 1440, height: 900 },
  { nome: "monitor", width: 1920, height: 1080 },
];

async function abrir(page: Page) {
  const erros: string[] = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  // Espera a entrada do anel terminar.
  await page.waitForTimeout(1200);
  return erros;
}

const caixa = async (page: Page, seletor: string) => (await page.locator(seletor).first().boundingBox())!;
const encosta = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

for (const tela of TELAS) {
  test.describe(`tela ${tela.nome} (${tela.width}x${tela.height})`, () => {
    test.use({ viewport: { width: tela.width, height: tela.height } });

    test("sem rolagem lateral, sem erro e com tudo à vista", async ({ page }) => {
      const erros = await abrir(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      for (const s of ["#dot-vivo", "#carrossel", "#estados", "#botao-cor", "#surpresa", "#time"]) {
        await expect(page.locator(s)).toBeVisible();
      }
      await page.screenshot({ path: `tests/screens/${tela.nome}.png`, fullPage: true });
      expect(erros).toEqual([]);
    });

    test("anel não encosta no cabeçalho nem nas laterais", async ({ page }) => {
      await abrir(page);
      const cabecalho = await caixa(page, "header");
      const itens = page.locator("#anel [data-expressao]");
      const n = await itens.count();
      const laterais = [await caixa(page, "#time"), await caixa(page, "#estados")];
      const doca = await caixa(page, "#botao-cor");
      expect(encosta(doca, cabecalho), "doca encostando no cabeçalho").toBe(false);
      const emAnel = await page.evaluate(() => matchMedia("(min-width: 768px) and (min-height: 700px)").matches);
      for (let i = 0; i < n && emAnel; i++) {
        const b = (await itens.nth(i).boundingBox())!;
        expect(b.y, `expressão ${i} embaixo do cabeçalho`).toBeGreaterThanOrEqual(cabecalho.y + cabecalho.height);
        for (const l of laterais) expect(encosta(b, l), `expressão ${i} encostando numa lateral`).toBe(false);
      }
    });

    if (tela.width < 768) {
      test("alvos de toque com pelo menos 44px", async ({ page }) => {
        await abrir(page);
        const pequenos = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>("header a, header button, #estados button, #botao-cor, #surpresa, #abrir-codigo, #salvar")]
            .filter((el) => el.offsetParent !== null)
            .map((el) => ({ id: el.id || el.getAttribute("aria-label") || el.textContent?.trim(), ...el.getBoundingClientRect().toJSON() }))
            .filter((r) => r.width < 44 || r.height < 44),
        );
        expect(pequenos).toEqual([]);
      });
    }
  });
}

test.describe("interação", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("expressão só muda no clique e o anel acompanha", async ({ page }) => {
    await abrir(page);
    const olhosAntes = await page.locator("#dot-vivo .vivo-olhos").innerHTML();
    const alvo = page.locator('#anel [data-expressao="coracao"]');
    await alvo.hover();
    expect(await page.locator("#dot-vivo .vivo-olhos").innerHTML()).toBe(olhosAntes);
    await alvo.click();
    await expect(alvo).toHaveAttribute("aria-checked", "true");
    expect(await page.locator("#dot-vivo .vivo-olhos").innerHTML()).not.toBe(olhosAntes);
    expect(page.url()).toContain("e=coracao");
  });

  test("clicar no dot do meio faz ele sorrir", async ({ page }) => {
    await abrir(page);
    await page.locator("#dot-vivo").click();
    await expect(page.locator("#dot-vivo svg")).toHaveAttribute("data-feliz", "");
    await expect(page.locator("#dot-vivo svg")).not.toHaveAttribute("data-feliz", "", { timeout: 3000 });
  });

  test("arrastar os olhos e mudar a cor deles", async ({ page }) => {
    await abrir(page);
    const b = await caixa(page, "#dot-vivo");
    const [x, y] = [b.x + b.width / 2, b.y + b.height * 0.45];
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 40, y - 20, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => page.url()).toMatch(/x=\d+/);
    // Arrastar não conta como cutucada.
    await expect(page.locator("#dot-vivo svg")).not.toHaveAttribute("data-feliz", "");
    await page.locator("#abrir-rosto").click();
    await page.locator("#centralizar").click();
    await expect.poll(() => page.url()).not.toContain("x=");
    await expect(page.locator("#centralizar")).toBeDisabled();
    await page.locator("#vao-olho").fill("-10");
    await expect.poll(() => page.url()).toContain("v=-10");
    await page.keyboard.press("Escape");

    await page.locator("#botao-olho").click();
    await expect(page.locator('.lamina[data-cor="auto"]')).toBeVisible();
    await page.locator('.lamina[data-cor="#ffffff"]').focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => page.url()).toContain("o=ffffff");
    await expect(page.locator("#botao-olho")).toHaveAttribute("aria-label", "Cor dos olhos: Branco");
  });

  test("formato, estado e teclado", async ({ page }) => {
    await abrir(page);
    await page.locator('#carrossel [data-formato="nuvem"]').click();
    await expect(page.locator("#nome-formato")).toHaveText("Nuvem");
    await page.locator('#carrossel [aria-checked="true"]').focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#nome-formato")).toHaveText("Flor");
    await page.locator('#estados button[data-estado="pensando"]').click();
    await expect(page.locator("#dot-vivo svg")).toHaveAttribute("data-estado", "pensando");
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("#dot-vivo svg")).toHaveAttribute("data-estado", "escrevendo");
  });

  test("leque de cores pinta o dot e todas as expressões", async ({ page }) => {
    await abrir(page);
    await page.locator("#botao-cor").click();
    await expect(page.locator("#leque")).toHaveAttribute("data-aberto", "");
    // Toda lâmina dentro da tela.
    await page.waitForTimeout(900);
    const fora = await page.evaluate(() =>
      [...document.querySelectorAll(".lamina")].filter((l) => {
        const r = l.getBoundingClientRect();
        return r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight;
      }).length,
    );
    expect(fora).toBe(0);
    await page.locator('.lamina[data-cor="#4c9be8"]').focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#leque")).toBeHidden();
    const pintados = await page.locator('#anel [data-expressao] path[data-tom="fill:b"]').evaluateAll((els) =>
      els.every((el) => el.getAttribute("fill") === "#4c9be8"),
    );
    expect(pintados).toBe(true);
    await page.locator("#botao-cor").click();
    await page.keyboard.press("Escape");
    await expect(page.locator("#leque")).toBeHidden();
  });

  test("time: salvar, abrir e tirar", async ({ page }) => {
    await abrir(page);
    await page.locator("#salvar").click();
    await expect(page.locator("#lista-time li")).toHaveCount(1);
    await page.locator('#carrossel [data-formato="nuvem"]').click();
    await page.locator("#salvar").click();
    await expect(page.locator("#lista-time li")).toHaveCount(2);
    await page.locator("#lista-time li").first().locator("button").first().click();
    await expect(page.locator("#nome-formato")).toHaveText("Fantasma");
    await page.locator("#lista-time li").first().hover();
    await page.getByRole("button", { name: "Tirar do time" }).first().click();
    await expect(page.locator("#lista-time li")).toHaveCount(1);
  });

  test("ajustes: tema escuro e de volta", async ({ page }) => {
    await abrir(page);
    await page.locator("#abrir-ajustes").click();
    await page.getByRole("radio", { name: "Escuro" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-tema", "escuro");
    await page.screenshot({ path: "tests/screens/escuro.png" });
    await page.getByRole("radio", { name: "Claro" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-tema", "claro");
    await page.keyboard.press("Escape");
    await expect(page.locator("#ajustes")).toBeHidden();
  });

  test("exportar: copiar SVG, baixar SVG e GIF", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await abrir(page);
    const menu = page.locator("#menu-exportar");
    await page.locator("#abrir-exportar").click();
    await menu.locator("[data-acao=copiar-svg]").click();
    await expect(page.locator("#avisos")).toContainText("SVG animado copiado");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('data-estado="ocioso"');

    await page.locator("#abrir-exportar").click();
    const [svg] = await Promise.all([page.waitForEvent("download"), menu.locator("[data-acao=baixar-svg]").click()]);
    expect(svg.suggestedFilename()).toBe("dot-fantasma-f08a24-ocioso.svg");

    await page.locator("#abrir-exportar").click();
    const [gif] = await Promise.all([page.waitForEvent("download", { timeout: 45_000 }), menu.locator("[data-acao=baixar-gif]").click()]);
    expect(gif.suggestedFilename()).toBe("dot-fantasma-f08a24-ocioso.gif");
  });

  test("SVG parado sai sem animação e miniaturas não animam por dentro", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await abrir(page);
    await page.locator("#abrir-exportar").click();
    await page.locator('#menu-exportar [data-estilo="parado"]').click();
    await page.locator("#menu-exportar [data-acao=copiar-svg]").click();
    await expect(page.locator("#avisos")).toContainText("SVG parado copiado");
    const svg = await page.evaluate(() => navigator.clipboard.readText());
    expect(svg).not.toContain("<style>");
    expect(svg).not.toContain("@keyframes");
    // Só o dot do meio e a aba escolhida podem animar por dentro do SVG; o resto anima por fora ou fica parado.
    const dentroDeSvg = await page.evaluate(() =>
      // Só animações de CSS: a piscada sorteada é curta e de propósito, e não entra na conta.
      document.getAnimations().filter((a) => {
        const alvo = (a.effect as KeyframeEffect | null)?.target;
        return a instanceof CSSAnimation && alvo instanceof SVGElement && !alvo.closest("#dot-vivo, #estados");
      }).length,
    );
    expect(dentroDeSvg).toBe(0);
  });

  test("copiar PNG no tamanho escolhido", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await abrir(page);
    await page.locator("#abrir-exportar").click();
    await page.getByRole("menuitemradio", { name: "512 px" }).click();
    await expect(page.getByRole("menuitemradio", { name: "512 px" })).toHaveAttribute("aria-checked", "true");
    await page.locator("#menu-exportar [data-acao=copiar-png]").click();
    await expect(page.locator("#avisos")).toContainText("512 px");
  });
});

test.describe("celular", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("menu de exportar cabe na tela, abre e fecha", async ({ page }) => {
    await abrir(page);
    await page.locator("#abrir-exportar").click();
    const menu = page.locator("#menu-exportar");
    await expect(menu).toBeVisible();
    const b = (await menu.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(390);
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });
});
