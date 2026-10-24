// Gera as imagens do README (docs/) e a capa de compartilhamento (public/capa.png) a partir do build.
// Uso: pnpm build && pnpm imagens
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";

const porta = 4401;
const base = `http://localhost:${porta}`;
const servidor = spawn(process.execPath, ["tests/servidor.mjs"], { env: { ...process.env, PORTA: String(porta) }, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
await mkdir("docs", { recursive: true });

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ acceptDownloads: true, deviceScaleFactor: 2 });

async function pagina(largura, altura, hash = "", tema = "claro") {
  const p = await contexto.newPage();
  await p.setViewportSize({ width: largura, height: altura });
  await p.addInitScript((t) => {
    localStorage.setItem("labdots:ajustes", JSON.stringify({ tema: t }));
    // Limpa o time só na primeira carga da aba, pra captura do time poder juntar vários dots.
    if (!sessionStorage.getItem("limpo")) localStorage.removeItem("labdots:time");
    sessionStorage.setItem("limpo", "1");
  }, tema);
  await p.goto(`${base}/${hash}`);
  await p.waitForTimeout(1600);
  return p;
}

/** Recorte em volta de um elemento, com folga e sem sair da tela. */
async function recorte(p, seletor, folga = 24) {
  const b = await p.locator(seletor).first().boundingBox();
  const v = p.viewportSize();
  const x = Math.max(0, b.x - folga);
  const y = Math.max(0, b.y - folga);
  return { x, y, width: Math.min(v.width - x, b.width + folga * 2), height: Math.min(v.height - y, b.height + folga * 2) };
}

const telas = [
  ["laboratorio", 1440, 900, "#f=gato&e=cristal&c=e8553a&s=ocioso", "claro"],
  ["escuro", 1440, 900, "#f=robo&e=brilho&c=4c9be8&s=pensando", "escuro"],
  ["tablet", 768, 1024, "#f=nuvem&e=atento&c=3fb8a0&s=ouvindo", "claro"],
  ["celular", 390, 844, "#f=sapo&e=atento&c=a5c64a&s=ocioso", "claro"],
  ["celular-escuro", 390, 844, "#f=estrela&e=sonhador&c=e8b931&s=sucesso", "escuro"],
];

try {
  for (const [nome, l, a, hash, tema] of telas) {
    const p = await pagina(l, a, hash, tema);
    await p.screenshot({ path: `docs/${nome}.png` });
    await p.close();
  }

  let p = await pagina(1200, 630, "#f=fantasma&e=cristal&c=f08a24&s=ocioso");
  await p.screenshot({ path: "public/capa.png", scale: "css" });
  await p.close();

  p = await pagina(1440, 900, "#f=estrela&e=cristal&c=e8b931&s=ocioso");
  await p.locator("#botao-cor").click();
  await p.waitForTimeout(900);
  await p.screenshot({ path: "docs/leque.png", clip: await recorte(p, "#leque", 230) });
  await p.close();

  p = await pagina(1440, 900, "#f=tofu&e=cristal&c=e5679b&s=ocioso&x=-14&y=-8&v=-6&l=1.4&o=ffffff");
  await p.locator("#abrir-rosto").click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: "docs/olhos.png", clip: { x: 360, y: 60, width: 1080, height: 700 } });
  await p.close();

  p = await pagina(1440, 900, "#f=ovo&e=brilho&c=7b4bb7&s=ocioso");
  await p.locator("#abrir-exportar").click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: "docs/exportar.png", clip: await recorte(p, "#menu-exportar") });
  await p.close();

  p = await pagina(1440, 900, "#f=bala&e=feliz&c=e8553a&s=ocioso");
  await p.locator('a[href*="github.com"]').hover();
  await p.waitForTimeout(1200);
  await p.screenshot({ path: "docs/github.png", clip: { x: 0, y: 0, width: 520, height: 230 } });
  await p.close();

  p = await pagina(1440, 900, "#f=fantasma&e=cristal&c=f08a24&s=ocioso");
  for (const hash of ["#f=gato&e=brilho&c=4c9be8&s=ocioso", "#f=robo&e=pixel&c=45454d&s=ocioso", "#f=morango&e=coracao&c=e8553a&s=ocioso", "#f=pinguim&e=atento&c=1c1b20&s=ocioso"]) {
    await p.locator("#salvar").click();
    await p.goto(`${base}/${hash}`);
    await p.reload();
    await p.waitForTimeout(700);
  }
  await p.locator("#salvar").click();
  await p.waitForTimeout(900);
  await p.screenshot({ path: "docs/time.png", clip: await recorte(p, "#time", 16) });
  await p.close();

  p = await contexto.newPage();
  await p.setViewportSize({ width: 1400, height: 900 });
  await p.goto(`${base}/catalogo/`);
  await p.waitForTimeout(1200);
  await p.locator("#formatos").screenshot({ path: "docs/formatos.png" });
  await p.locator("#expressoes").screenshot({ path: "docs/expressoes.png" });
  await p.locator("#estados").screenshot({ path: "docs/estados.png" });
  await p.close();

  // GIFs de verdade, saídos do próprio menu de exportar.
  for (const [hash, nome] of [
    ["#f=fantasma&e=cristal&c=f08a24&s=sucesso", "gif-sucesso"],
    ["#f=nuvem&e=atento&c=4c9be8&s=pensando", "gif-pensando"],
    ["#f=coracao&e=brilho&c=e5679b&s=ouvindo", "gif-ouvindo"],
    ["#f=gato&e=sonhador&c=7b4bb7&s=dormindo", "gif-dormindo"],
  ]) {
    p = await pagina(1440, 900, hash);
    await p.locator("#abrir-exportar").click();
    const [arquivo] = await Promise.all([p.waitForEvent("download", { timeout: 60_000 }), p.locator("#menu-exportar [data-acao=baixar-gif]").click()]);
    await arquivo.saveAs(`docs/${nome}.gif`);
    await p.close();
  }
  console.log("imagens geradas em docs/ e public/capa.png");
} finally {
  await navegador.close();
  servidor.kill();
}
