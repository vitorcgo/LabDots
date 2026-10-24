export type Jeito = "rola" | "deriva" | "balanca" | "flutua" | "inclina" | "amassa" | "treme" | "ginga";

export interface Formato {
  id: string;
  nome: string;
  d: string;
  /** Caixa aproximada do corpo (x0, y0, x1, y1). Posiciona bolhas, confete e zzz. */
  caixa: [number, number, number, number];
  /** Centro do rosto, distância de cada olho até o centro e escala dos olhos. */
  olho: { x: number; y: number; vao: number; escala: number };
  /** Movimento próprio do formato, somado ao do estado. */
  jeito: Jeito;
  /** Detalhes por cima do corpo. `tom` devolve o atributo de cor a partir de uma receita (ver resolverTom). */
  detalhe?: (tom: (spec: string, attr?: string) => string) => string;
}

// Curva fechada que passa por todos os pontos (Catmull-Rom convertida em Bézier).
function curvaFechada(pts: [number, number][]) {
  const n = pts.length;
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
}

function flor(cx: number, cy: number, raio: number, onda: number, petalas: number) {
  const pts: [number, number][] = [];
  const passos = petalas * 8;
  for (let i = 0; i < passos; i++) {
    const a = (i / passos) * Math.PI * 2 - Math.PI / 2;
    const r = raio + onda * Math.cos(petalas * (a + Math.PI / 2));
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return curvaFechada(pts);
}

function fantasma() {
  let d = "M60 140C60 96 92 64 128 64C164 64 196 96 196 140L196 206";
  for (let i = 0; i < 4; i++) {
    const x = 196 - i * 34;
    d += `Q${x - 17} 238 ${x - 34} 206`;
  }
  return d + "Z";
}

export const FORMATOS: Formato[] = [
  {
    id: "seixo",
    nome: "Seixo",
    d: "M124 70C172 66 210 96 212 142C214 190 178 220 128 220C80 220 44 196 44 150C44 104 78 73 124 70Z",
    caixa: [44, 70, 212, 220],
    olho: { x: 128, y: 144, vao: 27, escala: 1.3 },
    jeito: "rola",
  },
  {
    id: "nuvem",
    nome: "Nuvem",
    d: "M66 212C42 212 30 194 36 176C24 160 32 132 58 128C58 100 86 82 112 92C124 70 160 68 174 92C200 86 224 108 216 134C236 146 234 180 214 192C210 206 198 212 184 212C150 215 100 215 66 212Z",
    caixa: [30, 74, 230, 214],
    olho: { x: 128, y: 158, vao: 29, escala: 1.3 },
    jeito: "deriva",
  },
  {
    id: "flor",
    nome: "Flor",
    d: flor(128, 136, 70, 13, 6),
    caixa: [45, 53, 211, 219],
    olho: { x: 128, y: 136, vao: 22, escala: 1.15 },
    jeito: "balanca",
    detalhe: (tom) => `<circle cx="128" cy="136" r="40" ${tom("c0.16")}/>`,
  },
  {
    id: "fantasma",
    nome: "Fantasma",
    d: fantasma(),
    caixa: [60, 64, 196, 222],
    olho: { x: 128, y: 128, vao: 27, escala: 1.3 },
    jeito: "flutua",
  },
  {
    id: "feijao",
    nome: "Feijão",
    d: "M94 76C136 56 190 74 206 118C220 160 198 206 154 214C122 220 106 198 86 194C58 190 40 166 46 136C52 104 68 88 94 76Z",
    caixa: [44, 66, 210, 216],
    olho: { x: 132, y: 136, vao: 26, escala: 1.3 },
    jeito: "inclina",
  },
  {
    id: "tofu",
    nome: "Tofu",
    d: "M90 76H166C185 76 200 91 200 110V186C200 205 185 220 166 220H90C71 220 56 205 56 186V110C56 91 71 76 90 76Z",
    caixa: [56, 76, 200, 220],
    olho: { x: 128, y: 148, vao: 29, escala: 1.3 },
    jeito: "treme",
    detalhe: () =>
      `<path d="M76 116C76 102 82 96 94 96" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".35"/>`,
  },
  {
    id: "gato",
    nome: "Gato",
    d: "M60 120L62 66C62 60 68 58 72 62L104 88C120 84 136 84 152 88L184 62C188 58 194 60 194 66L196 120C204 136 206 152 204 168C198 204 166 222 128 222C90 222 58 204 52 168C50 152 52 136 60 120Z",
    caixa: [52, 58, 206, 222],
    olho: { x: 128, y: 152, vao: 30, escala: 1.3 },
    jeito: "inclina",
    detalhe: (tom) =>
      `<g ${tom("e0.22")} opacity=".55"><path d="M70 74L92 92C82 96 76 102 70 110Z"/><path d="M186 74L164 92C174 96 180 102 186 110Z"/></g>`,
  },
  {
    id: "gelatina",
    nome: "Gelatina",
    d: "M44 210C44 130 80 78 128 78C176 78 212 130 212 210C212 218 206 222 198 222L58 222C50 222 44 218 44 210Z",
    caixa: [44, 78, 212, 222],
    olho: { x: 128, y: 166, vao: 29, escala: 1.3 },
    jeito: "ginga",
    detalhe: () =>
      `<path d="M72 168C72 136 86 114 104 102" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".38"/>`,
  },
  {
    id: "ovo",
    nome: "Ovo",
    d: "M128 56C172 56 204 118 204 160C204 200 170 224 128 224C86 224 52 200 52 160C52 118 84 56 128 56Z",
    caixa: [52, 56, 204, 224],
    olho: { x: 128, y: 150, vao: 27, escala: 1.3 },
    jeito: "rola",
    detalhe: (tom) =>
      `<g ${tom("e0.14")}><circle cx="92" cy="104" r="4"/><circle cx="166" cy="118" r="5"/><circle cx="178" cy="182" r="3.5"/><circle cx="76" cy="186" r="4.5"/><circle cx="148" cy="80" r="3"/></g><path d="M86 92C94 78 104 70 114 66" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".35"/>`,
  },
  {
    id: "bala",
    nome: "Bala",
    d: "M70 140A58 58 0 1 1 186 140A58 58 0 1 1 70 140ZM80 116L36 94C24 110 24 170 36 186L80 164ZM176 116L220 94C232 110 232 170 220 186L176 164Z",
    caixa: [26, 82, 230, 198],
    olho: { x: 128, y: 136, vao: 24, escala: 1.2 },
    jeito: "balanca",
    detalhe: (tom) =>
      `<g fill="none" ${tom("e0.2", "stroke")} stroke-width="3" stroke-linecap="round" opacity=".6"><path d="M40 118L66 132M40 162L66 148"/><path d="M216 118L190 132M216 162L190 148"/></g><path d="M86 106C96 92 110 86 124 84" fill="none" ${tom("c0.45", "stroke")} stroke-width="7" stroke-linecap="round"/>`,
  },
  {
    id: "morango",
    nome: "Morango",
    d: "M128 224C96 214 56 180 52 136C48 100 84 86 128 92C172 86 208 100 204 136C200 180 160 214 128 224Z",
    caixa: [52, 64, 204, 224],
    olho: { x: 128, y: 140, vao: 26, escala: 1.25 },
    jeito: "ginga",
    detalhe: (tom) =>
      `<g ${tom("c0.6")}>${[
        [84, 124], [176, 128], [70, 156], [188, 160], [96, 190], [162, 192], [128, 206], [112, 108], [148, 110],
      ].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.4" ry="3.6"/>`).join("")}</g><path d="M128 100C112 82 92 84 84 92C100 92 108 98 114 104C104 104 96 112 96 118C108 110 118 108 128 108C138 108 148 110 160 118C160 112 152 104 142 104C148 98 156 92 172 92C164 84 144 82 128 100ZM126 100C124 88 126 74 134 66" ${tom("e0.42")} ${tom("e0.42", "stroke")} stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    id: "pinguim",
    nome: "Pinguim",
    d: "M128 52C168 52 190 96 192 150C194 196 168 224 128 224C88 224 62 196 64 150C66 96 88 52 128 52Z",
    caixa: [44, 52, 212, 228],
    olho: { x: 128, y: 104, vao: 20, escala: 1.1 },
    jeito: "inclina",
    detalhe: (tom) =>
      `<path d="M68 118C48 134 42 164 50 180C60 174 68 160 72 148ZM188 118C208 134 214 164 206 180C196 174 188 160 184 148Z" ${tom("e0.12")}/><ellipse cx="128" cy="170" rx="42" ry="50" ${tom("c0.78")}/><g ${tom("e0.3")}><ellipse cx="106" cy="224" rx="15" ry="6"/><ellipse cx="150" cy="224" rx="15" ry="6"/></g><path d="M121 124L135 124L128 134Z" ${tom("e0.35")}/>`,
  },
  {
    id: "sapo",
    nome: "Sapo",
    d: "M36 186C36 148 70 128 128 128C186 128 220 148 220 186C220 210 192 222 128 222C64 222 36 210 36 186ZM60 110A28 28 0 1 1 116 110A28 28 0 1 1 60 110ZM140 110A28 28 0 1 1 196 110A28 28 0 1 1 140 110Z",
    caixa: [36, 82, 220, 222],
    olho: { x: 128, y: 110, vao: 40, escala: 1 },
    jeito: "amassa",
    detalhe: (tom) =>
      `<g ${tom("c0.55")}><circle cx="88" cy="110" r="19"/><circle cx="168" cy="110" r="19"/></g><ellipse cx="128" cy="198" rx="60" ry="19" ${tom("c0.32")}/><g ${tom("e0.16")} opacity=".75"><circle cx="58" cy="168" r="6"/><circle cx="72" cy="186" r="4"/><circle cx="198" cy="168" r="6"/><circle cx="184" cy="186" r="4"/><circle cx="128" cy="146" r="3.5"/></g><g ${tom("e0.12")}><path d="M44 214C52 206 70 206 80 214C70 222 52 222 44 214Z"/><path d="M212 214C204 206 186 206 176 214C186 222 204 222 212 214Z"/></g>`,
  },
  {
    id: "robo",
    nome: "Robô",
    d: "M86 84H170C189 84 204 99 204 118V176C204 195 189 210 170 210H86C67 210 52 195 52 176V118C52 99 67 84 86 84ZM122 90V62H134V90ZM114 54A14 14 0 1 1 142 54A14 14 0 1 1 114 54ZM40 124H54V172H40C34 172 30 168 30 162V134C30 128 34 124 40 124ZM216 124C222 124 226 128 226 134V162C226 168 222 172 216 172H202V124Z",
    caixa: [30, 40, 226, 210],
    olho: { x: 128, y: 146, vao: 26, escala: 1.05 },
    jeito: "treme",
    detalhe: (tom) =>
      `<rect x="70" y="106" width="116" height="84" rx="24" ${tom("c0.78")}/><circle cx="128" cy="54" r="6" ${tom("c0.5")}/><g ${tom("e0.25")}><circle cx="40" cy="148" r="3.5"/><circle cx="216" cy="148" r="3.5"/></g>`,
  },
  {
    id: "estrela",
    nome: "Estrela",
    d: flor(128, 146, 66, 20, 5),
    caixa: [44, 56, 212, 222],
    olho: { x: 128, y: 146, vao: 22, escala: 1.15 },
    jeito: "balanca",
    detalhe: (tom) => `<path d="M100 104C106 96 114 92 122 90" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".35"/>`,
  },
  {
    id: "triangulo",
    nome: "Triângulo",
    d: "M110 74Q128 46 146 74L206 186Q220 214 188 214H68Q36 214 50 186Z",
    caixa: [44, 56, 212, 214],
    olho: { x: 128, y: 162, vao: 22, escala: 1.15 },
    jeito: "ginga",
    detalhe: (tom) => `<path d="M104 104L82 146" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".32"/><path d="M68 214H188" fill="none" ${tom("e0.15", "stroke")} stroke-width="4" stroke-linecap="round" opacity=".5"/>`,
  },
  {
    id: "coracao",
    nome: "Coração",
    d: "M128 220C96 196 44 166 44 120C44 90 66 72 90 72C108 72 120 82 128 96C136 82 148 72 166 72C190 72 212 90 212 120C212 166 160 196 128 220Z",
    caixa: [44, 72, 212, 220],
    olho: { x: 128, y: 134, vao: 28, escala: 1.25 },
    jeito: "amassa",
    detalhe: () => `<path d="M68 112C68 98 76 90 88 88" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".35"/>`,
  },
  {
    id: "torrada",
    nome: "Torrada",
    d: "M64 214V120C44 114 40 92 52 78C66 60 100 56 128 58C156 56 190 60 204 78C216 92 212 114 192 120V214C192 220 188 224 182 224H74C68 224 64 220 64 214Z",
    caixa: [44, 56, 212, 224],
    olho: { x: 128, y: 148, vao: 26, escala: 1.2 },
    jeito: "treme",
    detalhe: (tom) =>
      `<path d="M70 210V124C54 118 50 100 60 88C72 72 102 68 128 70C154 68 184 72 196 88C206 100 202 118 186 124V210" fill="none" ${tom("e0.24", "stroke")} stroke-width="7" stroke-linejoin="round" opacity=".55"/><rect x="146" y="86" width="34" height="22" rx="6" transform="rotate(-10 163 97)" ${tom("c0.8")}/>`,
  },
];

export const formatoPorId = (id: string) => FORMATOS.find((f) => f.id === id) ?? FORMATOS[0];
