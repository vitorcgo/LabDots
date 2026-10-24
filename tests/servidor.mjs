// Servidor estático mínimo pro Playwright testar o build (dist/) sem disputar a porta do `astro dev`.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const raiz = join(import.meta.dirname, "..", "dist");
const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
const porta = Number(process.env.PORTA ?? 4400);

createServer(async (req, res) => {
  let caminho = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, "");
  if (!extname(caminho)) caminho = join(caminho, "index.html");
  try {
    const corpo = await readFile(join(raiz, caminho));
    res.writeHead(200, { "content-type": tipos[extname(caminho)] ?? "application/octet-stream" });
    res.end(corpo);
  } catch {
    res.writeHead(404).end("não encontrado");
  }
}).listen(porta, () => console.log(`servindo dist em http://localhost:${porta}`));
