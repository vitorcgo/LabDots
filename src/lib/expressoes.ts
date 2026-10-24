/** Tintas de um olho: traço (T), parte clara (C), pupila sobre a parte clara (P), reflexo sobre o traço (R) e cor do corpo. */
export interface Tinta {
  T: string;
  C: string;
  P: string;
  /** Brilho desenhado em cima do olho: contrasta com T, então olho claro ganha brilho escuro. */
  R: string;
  corpo: string;
}

type Desenho = (t: Tinta) => string;

export interface Expressao {
  id: string;
  nome: string;
  esq: Desenho;
  /** Sem `dir`, o olho direito é o esquerdo espelhado. */
  dir?: Desenho;
  /** Mesmo desenho dos dois lados, sem espelhar (olhar de lado, barras). */
  igual?: boolean;
}

const linha = (d: string, w = 4.2) => (t: Tinta) =>
  `<path d="${d}" fill="none" stroke="${t.T}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

// Os olhos são compridos na vertical: é o que dá cara de bicho e não de emoji.
const reflexo = (t: Tinta, x = 2.4, y = -7) =>
  `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="4.4" fill="${t.R}"/><circle cx="${-x + 0.4}" cy="${-y + 0.6}" r="1.2" fill="${t.R}"/>`;
const cristal: Desenho = (t) => `<ellipse rx="7.4" ry="16" fill="${t.T}"/>${reflexo(t)}`;
const arco = linha("M-8 3Q0-9 8 3");

export const EXPRESSOES: Expressao[] = [
  { id: "cristal", nome: "Cristal", esq: cristal },
  { id: "ponto", nome: "Ponto", esq: (t) => `<ellipse rx="6.2" ry="13" fill="${t.T}"/>` },
  {
    id: "atento",
    nome: "Atento",
    esq: (t) =>
      `<ellipse rx="9" ry="16" fill="${t.C}"/><ellipse cx="1.4" cy="3" rx="5.6" ry="11" fill="${t.P}"/><ellipse cx="3.2" cy="-3" rx="1.9" ry="2.8" fill="${t.C}"/>`,
  },
  { id: "susto", nome: "Susto", esq: (t) => `<ellipse rx="10" ry="16" fill="${t.C}"/><ellipse rx="3.6" ry="5" fill="${t.P}"/>` },
  {
    id: "fino",
    nome: "Fino",
    esq: (t) => `<rect x="-4.4" y="-16" width="8.8" height="32" rx="4.4" fill="${t.T}"/><circle cx="1" cy="-9.5" r="1.8" fill="${t.R}"/>`,
  },
  {
    id: "brilho",
    nome: "Brilho",
    esq: (t) =>
      `<ellipse rx="8.8" ry="14" fill="${t.T}"/><ellipse cx="3" cy="-5" rx="3.2" ry="4.2" fill="${t.R}"/><circle cx="-3" cy="6" r="1.7" fill="${t.R}"/>`,
  },
  {
    id: "sonhador",
    nome: "Sonhador",
    esq: (t) =>
      `<ellipse rx="7.4" ry="15.5" fill="${t.T}"/><path d="M-5.6 5A6.6 9.6 0 0 0 5.6 5A7 5.2 0 0 1-5.6 5Z" fill="${t.R}" opacity=".85"/><ellipse cx="2.4" cy="-7" rx="2" ry="3" fill="${t.R}"/>`,
  },
  { id: "anel", nome: "Anel", esq: (t) => `<ellipse rx="6" ry="11" fill="none" stroke="${t.T}" stroke-width="3.6"/>` },
  { id: "feliz", nome: "Feliz", esq: arco },
  { id: "contente", nome: "Contente", esq: linha("M-8-3Q0 7 8-3") },
  { id: "pixel", nome: "Pixel", esq: (t) => `<rect x="-5.5" y="-12" width="11" height="24" rx="2.5" fill="${t.T}"/>` },
  { id: "traco", nome: "Traço", esq: linha("M-8 0H8") },
  { id: "aperto", nome: "Aperto", esq: linha("M-6-7L6 0L-6 7") },
  { id: "barra", nome: "Barra", esq: linha("M-5 8L5-8"), igual: true },
  { id: "mais", nome: "Mais", esq: linha("M-7 0H7M0-7V7", 3.8) },
  { id: "xis", nome: "Xis", esq: linha("M-6-6L6 6M6-6L-6 6", 3.8) },
  {
    id: "brava",
    nome: "Brava",
    esq: (t) => `<ellipse cy="3" rx="6.2" ry="11.5" fill="${t.T}"/>${linha("M-9-16L7-10", 3.6)(t)}`,
  },
  {
    id: "preocupada",
    nome: "Preocupada",
    esq: (t) => `<ellipse cy="3" rx="6.2" ry="11.5" fill="${t.T}"/>${linha("M-8-12L7-17", 3.6)(t)}`,
  },
  {
    id: "sono",
    nome: "Sono",
    esq: (t) => `<path d="M-7.5-1A7.5 13 0 0 0 7.5-1Z" fill="${t.T}"/>${linha("M-9.5-1H9.5", 3.4)(t)}`,
  },
  {
    id: "tedio",
    nome: "Tédio",
    igual: true,
    esq: (t) =>
      `<circle r="10" fill="${t.C}"/><circle cx="4.5" cy="2.5" r="4.6" fill="${t.P}"/><path d="M-11-.5A11 11 0 0 1 11-.5Z" fill="${t.corpo}"/>${linha("M-10.5-.5H10.5", 3)(t)}`,
  },
  {
    id: "coracao",
    nome: "Coração",
    esq: (t) =>
      `<path transform="scale(1.25)" d="M0 8C-10 1-10-7.5-4.8-7.5C-2.2-7.5 0-5.6 0-3.6C0-5.6 2.2-7.5 4.8-7.5C10-7.5 10 1 0 8Z" fill="${t.T}"/>`,
  },
  {
    id: "tonto",
    nome: "Tonto",
    esq: linha("M0 0C1.6-1.6 3.4 0 2.2 2.2C1 4.2-3.4 3.6-3.8 0C-4.2-4.4 1.2-6.6 4.4-4.4C7.6-2.2 7.6 3.4 4.8 6", 2.6),
  },
  {
    id: "choro",
    nome: "Choro",
    esq: (t) =>
      `<ellipse rx="6.2" ry="13" fill="${t.T}"/><path d="M-2.5 14C-6 18.5-6 22.5-2.5 23.5C1 22.5 1 18.5-2.5 14Z" fill="${t.C}" opacity=".9"/>`,
  },
  { id: "piscadela", nome: "Piscadela", esq: cristal, dir: arco },
  {
    id: "desconfiado",
    nome: "Desconfiado",
    esq: linha("M-8 0H8"),
    dir: (t) => `<ellipse cy="2" rx="6.2" ry="11.5" fill="${t.T}"/>${linha("M-8-14L8-16.5", 3.4)(t)}`,
  },
];

export const expressaoPorId = (id: string) => EXPRESSOES.find((e) => e.id === id) ?? EXPRESSOES[0];

/** Olhos fechados (dormindo) e em arco (sucesso) substituem a expressão nesses estados. */
export const FECHADOS: Expressao = { id: "fechados", nome: "Fechados", esq: linha("M-8-1Q0 6.5 8-1") };
export const ARCOS: Expressao = { id: "arcos", nome: "Arcos", esq: arco };
