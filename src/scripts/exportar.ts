import { zipSync, strToU8 } from "fflate";
import { ESTADOS, estadoPorId, type EstadoId } from "../lib/estados";
import { formatoPorId } from "../lib/formatos";
import { gerarDot, type Dot, type Opcoes } from "../lib/gerador";
import { gifDe, pngDe } from "./rasterizar";
import type { Ajustes } from "./loja";

const base = (a: Ajustes): Opcoes => ({ bochechas: a.bochechas, sombra: a.sombra, velocidade: a.velocidade });

export const nomeDoArquivo = (d: Dot) => `dot-${d.formato}-${d.cor.slice(1)}`;

export function svgDoEstado(d: Dot, estado: EstadoId, a: Ajustes) {
  return gerarDot(d, { ...base(a), estado, estados: [estado], animado: a.estilo === "animado", tamanho: 256 });
}

export const svgUnico = (d: Dot, a: Ajustes) => gerarDot(d, { ...base(a), tamanho: 256 });

export const pngDoEstado = (d: Dot, estado: EstadoId, tamanho: number, a: Ajustes) =>
  pngDe(gerarDot(d, { ...base(a), estado, animado: false }), tamanho);

export function gifDoEstado(d: Dot, estado: EstadoId, a: Ajustes, aoAvancar?: (p: number) => void) {
  const op = { ...base(a), estado, estados: [estado], tamanho: 256, prefixo: "g" };
  return gifDe((t) => gerarDot(d, { ...op, congelarEm: t }), estadoPorId(estado).ciclo / a.velocidade, {
    tamanho: 256,
    transparente: a.fundoGif === "transparente",
    aoAvancar,
  });
}

/** Folha com uma linha por dot e uma coluna por estado. Cada célula tem prefixo próprio pro CSS não se misturar. */
export function folha(dots: Dot[], a: Ajustes) {
  const celula = 256;
  const legenda = 34;
  const largura = celula * ESTADOS.length;
  const altura = (celula + legenda) * dots.length;
  let miolo = "";
  dots.forEach((d, l) => {
    ESTADOS.forEach((e, c) => {
      const x = c * celula;
      const y = l * (celula + legenda);
      const svg = gerarDot(d, {
        ...base(a),
        estado: e.id,
        estados: [e.id],
        animado: a.estilo === "animado",
        tamanho: celula,
        prefixo: `f${l}x${c}`,
      });
      miolo += svg.replace("<svg ", `<svg x="${x}" y="${y}" `);
      miolo += `<text x="${x + celula / 2}" y="${y + celula + 20}" text-anchor="middle" font-family="Bricolage Grotesque, system-ui, sans-serif" font-size="15" fill="#5c544b">${formatoPorId(d.formato).nome} · ${e.nome}</text>`;
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} ${altura}" width="${largura}" height="${altura}">${miolo}</svg>`;
}

async function arquivosDoDot(d: Dot, a: Ajustes, pasta: string, aoAvancar: (p: number) => void) {
  const arquivos: Record<string, Uint8Array> = {};
  arquivos[`${pasta}/${nomeDoArquivo(d)}-todos-os-estados.svg`] = strToU8(svgUnico(d, a));
  for (let i = 0; i < ESTADOS.length; i++) {
    const e = ESTADOS[i].id;
    arquivos[`${pasta}/svg/${e}.svg`] = strToU8(svgDoEstado(d, e, a));
    arquivos[`${pasta}/png/${e}.png`] = new Uint8Array(await (await pngDoEstado(d, e, 512, a)).arrayBuffer());
    const gif = await gifDoEstado(d, e, a, (p) => aoAvancar((i + p) / ESTADOS.length));
    arquivos[`${pasta}/gif/${e}.gif`] = new Uint8Array(await gif.arrayBuffer());
  }
  return arquivos;
}

export async function zipDoDot(d: Dot, a: Ajustes, aoAvancar: (p: number) => void) {
  const arquivos = await arquivosDoDot(d, a, nomeDoArquivo(d), aoAvancar);
  return new Blob([zipSync(arquivos, { level: 6 }) as BlobPart], { type: "application/zip" });
}

export async function zipDoTime(time: Dot[], a: Ajustes, aoAvancar: (p: number) => void) {
  let arquivos: Record<string, Uint8Array> = {};
  for (let i = 0; i < time.length; i++) {
    const pasta = `${String(i + 1).padStart(2, "0")}-${nomeDoArquivo(time[i])}`;
    const daqui = await arquivosDoDot(time[i], a, pasta, (p) => aoAvancar((i + p) / time.length));
    arquivos = { ...arquivos, ...daqui };
  }
  arquivos["time.svg"] = strToU8(folha(time, a));
  return new Blob([zipSync(arquivos, { level: 6 }) as BlobPart], { type: "application/zip" });
}

export function baixar(conteudo: Blob | string, nome: string) {
  const blob = typeof conteudo === "string" ? new Blob([conteudo], { type: "image/svg+xml" }) : conteudo;
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: nome });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function copiarTexto(texto: string) {
  await navigator.clipboard.writeText(texto);
}

/** O PNG vai como promessa pro ClipboardItem: o Safari só aceita assim, dentro do clique. */
export async function copiarPng(png: Promise<Blob>) {
  if (!("ClipboardItem" in window)) throw new Error("sem ClipboardItem");
  await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
}
