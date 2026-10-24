import { ehHex, normalizarHex } from "../lib/cor";
import { ESTADOS, type EstadoId } from "../lib/estados";
import { EXPRESSOES } from "../lib/expressoes";
import { FORMATOS } from "../lib/formatos";
import { LIMITE_OLHAR, LIMITES_ROSTO, type Dot } from "../lib/gerador";
import { DOT_INICIAL } from "../lib/padrao";

export interface Ajustes {
  tema: "claro" | "escuro";
  velocidade: number;
  seguir: boolean;
  bochechas: boolean;
  sombra: boolean;
  tamanhoPng: number;
  estilo: "animado" | "parado";
  fundoGif: "branco" | "transparente";
}

export interface Membro extends Dot {
  id: string;
}

const CHAVE_AJUSTES = "labdots:ajustes";
const CHAVE_TIME = "labdots:time";
export const LIMITE_TIME = 12;

const AJUSTES_PADRAO: Ajustes = {
  tema: "claro",
  velocidade: 1,
  seguir: true,
  bochechas: false,
  sombra: true,
  tamanhoPng: 128,
  estilo: "animado",
  fundoGif: "branco",
};

// localStorage pode não existir (aba anônima, bloqueio de cookies): aí tudo vive só na memória.
function ler<T>(chave: string, padrao: T): T {
  try {
    const v = localStorage.getItem(chave);
    return v ? { ...padrao, ...JSON.parse(v) } : padrao;
  } catch {
    return padrao;
  }
}
function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {}
}

function lerTime(): Membro[] {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE_TIME) || "[]");
    return Array.isArray(v) ? v.filter(dotValido).slice(0, LIMITE_TIME) : [];
  } catch {
    return [];
  }
}

const dentro = (v: unknown, [min, max]: readonly [number, number]) =>
  v === undefined || (typeof v === "number" && v >= min && v <= max);
const deslocamentoValido = (v: unknown) => v === undefined || (typeof v === "number" && Math.abs(v) <= LIMITE_OLHAR);

function dotValido(d: Partial<Dot>): d is Dot {
  return (
    !!d &&
    FORMATOS.some((f) => f.id === d.formato) &&
    EXPRESSOES.some((e) => e.id === d.expressao) &&
    typeof d.cor === "string" &&
    ehHex(d.cor) &&
    (d.corOlho === undefined || ehHex(d.corOlho)) &&
    deslocamentoValido(d.olhoX) &&
    deslocamentoValido(d.olhoY) &&
    dentro(d.vaoOlho, LIMITES_ROSTO.vao) &&
    dentro(d.larguraOlho, LIMITES_ROSTO.largura)
  );
}

const mesmoDot = (a: Dot, b: Dot) =>
  a.formato === b.formato &&
  a.expressao === b.expressao &&
  a.cor === b.cor &&
  a.corOlho === b.corOlho &&
  (a.olhoX ?? 0) === (b.olhoX ?? 0) &&
  (a.olhoY ?? 0) === (b.olhoY ?? 0) &&
  (a.vaoOlho ?? 0) === (b.vaoOlho ?? 0) &&
  (a.larguraOlho ?? 1) === (b.larguraOlho ?? 1);

/** Lê o dot do endereço: #f=gato&e=brilho&c=e8553a&s=pensando, e opcionalmente o=cor dos olhos, x/y=posição do rosto. */
function lerEndereco(): { dot?: Dot; estado?: EstadoId } {
  const q = new URLSearchParams(location.hash.slice(1));
  const cor = q.get("c");
  const olho = q.get("o");
  const numero = (k: string) => (q.has(k) ? Number(q.get(k)) : undefined);
  const dot: Dot = { formato: q.get("f") ?? "", expressao: q.get("e") ?? "", cor: cor ? normalizarHex(cor) : "" };
  if (olho && ehHex(olho)) dot.corOlho = normalizarHex(olho);
  if (numero("x")) dot.olhoX = numero("x");
  if (numero("y")) dot.olhoY = numero("y");
  if (numero("v")) dot.vaoOlho = numero("v");
  if (numero("l")) dot.larguraOlho = numero("l");
  const s = q.get("s") as EstadoId | null;
  return {
    dot: dotValido(dot) ? dot : undefined,
    estado: s && ESTADOS.some((e) => e.id === s) ? s : undefined,
  };
}

type Ouvinte = (motivo: string) => void;

export const loja = {
  dot: { ...DOT_INICIAL } as Dot,
  estado: "ocioso" as EstadoId,
  ajustes: ler(CHAVE_AJUSTES, AJUSTES_PADRAO),
  time: lerTime(),
  ouvintes: [] as Ouvinte[],

  iniciar() {
    const e = lerEndereco();
    if (e.dot) this.dot = e.dot;
    if (e.estado) this.estado = e.estado;
  },
  ouvir(fn: Ouvinte) {
    this.ouvintes.push(fn);
  },
  avisar(motivo: string) {
    this.ouvintes.forEach((fn) => fn(motivo));
  },
  mudarDot(parcial: Partial<Dot>, motivo = "dot") {
    this.dot = { ...this.dot, ...parcial };
    if (!this.dot.corOlho) delete this.dot.corOlho;
    if (!this.dot.olhoX) delete this.dot.olhoX;
    if (!this.dot.olhoY) delete this.dot.olhoY;
    if (!this.dot.vaoOlho) delete this.dot.vaoOlho;
    if (!this.dot.larguraOlho || this.dot.larguraOlho === 1) delete this.dot.larguraOlho;
    this.atualizarEndereco();
    this.avisar(motivo);
  },
  mudarEstado(estado: EstadoId) {
    this.estado = estado;
    this.atualizarEndereco();
    this.avisar("estado");
  },
  mudarAjuste<K extends keyof Ajustes>(chave: K, valor: Ajustes[K]) {
    this.ajustes[chave] = valor;
    gravar(CHAVE_AJUSTES, this.ajustes);
    this.avisar("ajuste:" + chave);
  },
  salvarNoTime(): "ok" | "cheio" | "repetido" {
    if (this.time.some((m) => mesmoDot(m, this.dot))) return "repetido";
    if (this.time.length >= LIMITE_TIME) return "cheio";
    this.time.push({ ...this.dot, id: Math.random().toString(36).slice(2, 9) });
    gravar(CHAVE_TIME, this.time);
    this.avisar("time");
    return "ok";
  },
  tirarDoTime(id: string) {
    this.time = this.time.filter((m) => m.id !== id);
    gravar(CHAVE_TIME, this.time);
    this.avisar("time");
  },
  endereco() {
    const { formato, expressao, cor, corOlho, olhoX, olhoY, vaoOlho, larguraOlho } = this.dot;
    const q = new URLSearchParams({ f: formato, e: expressao, c: cor.slice(1), s: this.estado });
    if (corOlho) q.set("o", corOlho.slice(1));
    if (olhoX) q.set("x", String(olhoX));
    if (olhoY) q.set("y", String(olhoY));
    if (vaoOlho) q.set("v", String(vaoOlho));
    if (larguraOlho) q.set("l", String(larguraOlho));
    return `${location.origin}${location.pathname}#${q}`;
  },
  atualizarEndereco() {
    history.replaceState(null, "", this.endereco());
  },
};
