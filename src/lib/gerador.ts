import { clarear, escurecer, luminancia, misturar } from "./cor";
import { ESTADOS, estadoPorId, type EstadoId } from "./estados";
import { ARCOS, FECHADOS, expressaoPorId, type Expressao, type Tinta } from "./expressoes";
import { formatoPorId, type Formato } from "./formatos";

export interface Dot {
  formato: string;
  expressao: string;
  cor: string;
  /** Cor dos olhos. Sem ela, os olhos ficam escuros ou claros conforme o corpo. */
  corOlho?: string;
  /** Deslocamento do rosto em relação ao centro do formato. */
  olhoX?: number;
  olhoY?: number;
  /** Soma à distância entre os olhos (negativo junta, positivo afasta). */
  vaoOlho?: number;
  /** Multiplica a largura de cada olho. */
  larguraOlho?: number;
}

export const LIMITES_ROSTO = { vao: [-14, 18], largura: [0.6, 1.8] } as const;

/** Até onde o rosto pode ser arrastado pra cada lado. */
export const LIMITE_OLHAR = 24;

export interface Opcoes {
  /** Estados incluídos no arquivo. Padrão: todos. */
  estados?: EstadoId[];
  /** Estado inicial (atributo data-estado). */
  estado?: EstadoId;
  /** false gera um quadro parado, sem CSS. */
  animado?: boolean;
  /** Pausa todas as animações nesse instante (segundos). Usado pra tirar os quadros do GIF. */
  congelarEm?: number;
  /** Prefixo das classes. Precisa ser único quando vários dots dividem a mesma página. */
  prefixo?: string;
  tamanho?: number;
  sombra?: boolean;
  bochechas?: boolean;
  velocidade?: number;
  /** Versão da página: olhar segue o ponteiro e as cores trocam com transição. */
  vivo?: boolean;
  fundo?: string;
  rotulo?: string;
  /** Só a silhueta, pro carrossel de formatos. */
  semRosto?: boolean;
  /** Adianta o ciclo em segundos, pra vários dots na mesma tela não piscarem juntos. */
  fase?: number;
  /** Aproxima o enquadramento no corpo (miniaturas). */
  recortado?: boolean;
  /**
   * Lê o adiantamento da variável CSS --fase em vez de gravar no CSS. Assim vários dots com o mesmo
   * prefixo dividem um CSS só, cada um no seu tempo.
   */
  faseVariavel?: boolean;
}

/** Tom derivado da cor base: "b" (a própria), "c0.5" (clareia), "e0.3" (escurece), "r0.4" (puxa pro rosado). */
export function resolverTom(cor: string, spec: string) {
  const n = parseFloat(spec.slice(1));
  if (spec[0] === "c") return clarear(cor, n);
  if (spec[0] === "e") return escurecer(cor, n);
  if (spec[0] === "r") return misturar(cor, "#ff6f8e", n);
  return cor;
}

const contraste = (c: string) => (luminancia(c) > 0.45 ? "#1e1b18" : "#fffdf8");

export function tintaDosOlhos(cor: string, corOlho?: string): Tinta {
  const T = corOlho ?? (luminancia(cor) < 0.2 ? "#fff6ea" : "#1e1b18");
  // Pupila em cima da parte branca: se o olho for claro demais, ela fica escura pra continuar aparecendo.
  const P = corOlho && luminancia(corOlho) <= 0.6 ? corOlho : "#1e1b18";
  return { T, C: "#fffdf8", P, R: contraste(T), corpo: cor };
}

const EM_GRAUS = Math.PI / 180;
const n2 = (v: number) => +v.toFixed(2);

const vaoDo = (f: Formato, dot: Dot) => f.olho.vao + (dot.vaoOlho ?? 0);

function desenharOlhos(e: Expressao, f: Formato, t: Tinta, dot: Dot) {
  const s = f.olho.escala;
  const vao = vaoDo(f, dot);
  const sx = n2(s * (dot.larguraOlho ?? 1));
  const esq = `<g transform="translate(${-vao} 0) scale(${sx} ${s})">${e.esq(t)}</g>`;
  const dir = e.dir
    ? `<g transform="translate(${vao} 0) scale(${sx} ${s})">${e.dir(t)}</g>`
    : `<g transform="translate(${vao} 0) scale(${e.igual ? sx : -sx} ${s})">${e.esq(t)}</g>`;
  return esq + dir;
}

/** Miolo dos três conjuntos de olhos. A página usa pra trocar expressão sem refazer o SVG inteiro. */
export function olhosDoDot(dot: Dot) {
  const f = formatoPorId(dot.formato);
  const t = tintaDosOlhos(dot.cor, dot.corOlho);
  return {
    olhos: desenharOlhos(expressaoPorId(dot.expressao), f, t, dot),
    fechados: desenharOlhos(FECHADOS, f, t, dot),
    arcos: desenharOlhos(ARCOS, f, t, dot),
  };
}

/** SVG completo, com o CSS dentro. É o que vai pros arquivos exportados. */
export function gerarDot(dot: Dot, o: Opcoes = {}) {
  const { svg, css } = partesDoDot(dot, o);
  return css ? svg.replace(">", `><style>${css}</style>`) : svg;
}

/**
 * SVG e CSS separados. Na página, CSS dentro de um SVG vale pro documento inteiro; quando vários dots
 * dividem o prefixo, o CSS vai uma vez só num <style> da página.
 */
export function partesDoDot(dot: Dot, o: Opcoes = {}) {
  const f = formatoPorId(dot.formato);
  const p = o.prefixo ?? "dot";
  const animado = o.animado !== false;
  const vivo = !!o.vivo;
  const vel = o.velocidade ?? 1;
  const estado = o.estado ?? "ocioso";
  const estados = animado ? (o.estados ?? ESTADOS.map((e) => e.id)) : [estado];
  const cor = dot.cor;
  const tinta = tintaDosOlhos(cor, dot.corOlho);
  const [x0, y0, x1, y1] = f.caixa;
  const meioX = (x0 + x1) / 2;
  const meioY = (y0 + y1) / 2;

  // Atributo de cor. Na versão viva, guarda a receita do tom pra recolorir depois.
  const tom = (spec: string, attr = "fill") =>
    `${attr}="${resolverTom(cor, spec)}"${vivo ? ` data-tom="${attr}:${spec}"` : ""}`;

  // Declaração de animação. Com `congelarEm`, ela fica pausada naquele instante.
  const a = (nome: string, dur: number, atraso = 0, curva = "ease-in-out") => {
    const d = n2(dur / vel);
    let at = atraso / vel - (o.fase ?? 0);
    if (o.congelarEm !== undefined) at -= o.congelarEm;
    const pausa = o.congelarEm !== undefined ? ";animation-play-state:paused" : "";
    const inicio = o.faseVariavel ? `calc(${n2(at)}s - var(--fase,0s))` : `${n2(at)}s`;
    return `animation:${p}-${nome} ${d}s ${curva} ${inicio} infinite both${pausa}`;
  };
  const em = (est: EstadoId, parte: string) => `.${p}[data-estado=${est}] .${p}-${parte}`;
  const kf = (nome: string, corpo: string) => `@keyframes ${p}-${nome}{${corpo}}`;

  const css: string[] = [];
  const fx: Record<string, string> = {};
  // Pose fixa de cada estado, usada só no quadro parado.
  const pose: { corpo?: string; olhar?: string } = {};
  const parado = !animado;

  const ehFlor = f.jeito === "balanca";
  const alvoJeito = ehFlor ? "pele" : "jeito";
  const jeitoKf: Record<string, string> = {
    rola: "0%,50%,100%{transform:none}25%{transform:rotate(-2.5deg)}75%{transform:rotate(2.5deg)}",
    deriva: "0%,50%,100%{transform:none}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}",
    balanca: "0%,50%,100%{transform:none}25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}",
    flutua: "0%,100%{transform:none}50%{transform:translateY(-7px)}",
    inclina: "0%,50%,100%{transform:none}25%{transform:rotate(-3.5deg)}75%{transform:rotate(3.5deg)}",
    amassa: "0%,100%{transform:none}50%{transform:scale(1.035,.965)}",
    treme: "0%,40%,100%{transform:none}50%{transform:scale(1.035,.965)}60%{transform:scale(.985,1.02)}70%{transform:none}",
    ginga: "0%,50%,100%{transform:none}25%{transform:skewX(-4deg)}75%{transform:skewX(4deg)}",
  };

  const tem = (e: EstadoId) => estados.includes(e);

  if (animado) {
    css.push(
      `.${p}{overflow:visible}`,
      `.${p} *{transform-box:fill-box;transform-origin:center}`,
      `.${p}-corpo,.${p}-jeito{transform-box:view-box;transform-origin:${meioX}px ${y1}px}`,
      `.${p}-pele{transform-box:view-box;transform-origin:${meioX}px ${meioY}px}`,
      `.${p}-sombra{opacity:.16}`,
      `.${p}-fx,.${p}-fechados,.${p}-arcos{display:none}`,
      `.${p}-boca{opacity:0;transform:scale(.4);transition:opacity .2s,transform .3s cubic-bezier(.34,1.56,.64,1)}`,
      `.${p}-tinta{opacity:0}`,
      kf("jeito", jeitoKf[f.jeito]),
    );
    for (const est of estados) {
      const ciclo = estadoPorId(est).ciclo;
      const periodo = ciclo / Math.max(1, Math.round(ciclo / 3));
      css.push(`${em(est, alvoJeito)}{${a("jeito", periodo)}}`, `${em(est, "fx-" + est)}{display:inline}`);
    }
    if (vivo) {
      css.push(
        `.${p}-segue{transform:translate(var(--ox,0px),var(--oy,0px));transition:transform .25s cubic-bezier(.2,0,0,1)}`,
        `.${p}[data-estado=dormindo] .${p}-segue{transform:none}`,
        `.${p} [data-tom]{transition:fill .35s,stroke .35s}`,
        // Cutucado: sorri por um instante, em qualquer estado.
        `.${p}.${p}[data-feliz] .${p}-olhos,.${p}.${p}[data-feliz] .${p}-fechados{display:none}`,
        `.${p}.${p}[data-feliz] .${p}-arcos{display:inline}`,
        `.${p}.${p}[data-feliz] .${p}-boca{opacity:0}`,
        `.${p}.${p}[data-feliz] .${p}-sorriso{opacity:1;transform:none}`,
      );
    }
  }

  // ---------- estados ----------

  if (tem("ocioso")) {
    css.push(
      kf("respira", "0%,44%,82%,100%{transform:none}22%,66%{transform:translateY(-4px) scale(.985,1.03)}86%{transform:scale(1.05,.95)}90%{transform:translateY(-12px) scale(.97,1.04)}94%{transform:scale(1.03,.97)}97%{transform:none}"),
      kf("sombra-respira", "0%,44%,82%,100%{transform:none}22%,66%{transform:scaleX(.9);opacity:.1}90%{transform:scaleX(.74);opacity:.08}"),
      kf("olha", "0%,12%,72%,100%{transform:none}18%,30%{transform:translate(-4px,-1px)}36%,48%{transform:translate(4px,1px)}54%,64%{transform:translate(1px,-5px)}"),
      kf("pisca", "0%,58%,62%,86%,90%,93%,100%{transform:none}60%,88%,91.5%{transform:scaleY(.1)}"),
      `${em("ocioso", "corpo")}{${a("respira", 6)}}`,
      `${em("ocioso", "sombra")}{${a("sombra-respira", 6)}}`,
      `${em("ocioso", "olhar")}{${a("olha", 6)}}`,
      `${em("ocioso", "pisca")}{${a("pisca", 6, 0, "linear")}}`,
    );
  }

  if (tem("ouvindo")) {
    // Ondas chegando de fora até a orelha: quem ouve recebe o som, não emite.
    const ox = Math.min(x1 + 2, 214);
    const oy = f.olho.y - 6;
    let ondas = "";
    for (let i = 0; i < 3; i++) {
      ondas += `<path class="${p}-onda${i}" d="M0-16A16 16 0 0 1 0 16" fill="none" ${tom("e0.1", "stroke")} stroke-width="5" stroke-linecap="round"/>`;
      css.push(`${em("ouvindo", "onda" + i)}{${a("onda", 2.4, (-2.4 * i) / 3, "ease-in")}}`);
    }
    // Pontinho na orelha que acende quando cada onda chega.
    ondas += `<circle class="${p}-orelha" r="4" ${tom("e0.1")}/>`;
    fx.ouvindo = `<g transform="translate(${ox} ${oy})">${ondas}</g>`;
    pose.corpo = "rotate(5 128 220)";
    pose.olhar = "translate(4 -1)";
    css.push(
      kf("escuta", "0%,100%{transform:rotate(5deg)}25%{transform:rotate(7deg) translateY(-3px)}50%{transform:rotate(4deg)}75%{transform:rotate(6.5deg) translateY(-2px)}"),
      kf("onda", "0%{opacity:0;transform:translateX(30px) scale(1.35)}25%{opacity:1}85%{opacity:.9;transform:translateX(2px) scale(.55)}100%{opacity:0;transform:scale(.4)}"),
      kf("orelha", "0%,100%{transform:scale(.6);opacity:.5}28%,61%,94%{transform:scale(1.15);opacity:1}"),
      kf("pisca-curta", "0%,70%,74%,100%{transform:none}72%{transform:scaleY(.1)}"),
      `${em("ouvindo", "corpo")}{${a("escuta", 2.4)}}`,
      `${em("ouvindo", "olhar")}{transform:translate(5px,-1px)}`,
      `${em("ouvindo", "orelha")}{${a("orelha", 2.4)}}`,
      `${em("ouvindo", "pisca")}{${a("pisca-curta", 2.4, 0, "linear")}}`,
    );
  }

  if (tem("pensando")) {
    const bx = Math.min(x1, 210);
    const ny = Math.max(y0 - 46, 26);
    const surge = (ini: number) =>
      `0%,${ini}%{transform:scale(0);opacity:0}${ini + 9}%{transform:scale(1.15);opacity:1}${ini + 14}%,84%{transform:none;opacity:1}${(ini + 98) / 2}%{transform:translateY(-4px);opacity:1}94%,100%{transform:translateY(-10px) scale(.6);opacity:0}`;
    css.push(
      kf("bolha0", surge(0)),
      kf("bolha1", surge(8)),
      kf("bolha2", surge(16)),
      kf("pontinho", "0%,100%{transform:none;opacity:.4}40%{transform:translateY(-3px);opacity:1}"),
      kf("nuvem", "0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}"),
      kf("pondera", "0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg) translateY(-3px)}"),
      kf("olha-cima", "0%,100%{transform:translate(5px,-6px)}38%{transform:translate(5px,-8px)}52%,84%{transform:translate(-4px,-7px)}"),
      kf("pisca-longa", "0%,80%,84%,100%{transform:none}82%{transform:scaleY(.1)}"),
      `${em("pensando", "corpo")}{${a("pondera", 4)}}`,
      `${em("pensando", "olhar")}{${a("olha-cima", 4)}}`,
      `${em("pensando", "pisca")}{${a("pisca-longa", 4, 0, "linear")}}`,
      `${em("pensando", "nuvem")}{${a("nuvem", 2)}}`,
      ...[0, 1, 2].map((i) => `${em("pensando", "bolha" + i)}{${a("bolha" + i, 4, 0, "ease-out")}}`),
      ...[0, 1, 2].map((i) => `${em("pensando", "pt" + i)}{${a("pontinho", 0.8, -0.8 + i * 0.22)}}`),
    );
    const pontos = [-9, 0, 9].map((dx, i) => `<circle class="${p}-pt${i}" cx="${dx}" cy="1" r="3.4" ${tom("e0.3")}/>`).join("");
    // Nuvem de pensamento de verdade (vários círculos), com contorno pra aparecer em qualquer fundo.
    const nuvem = `<g ${tom("c0.62")} ${tom("e0.12", "stroke")} stroke-width="2"><ellipse cy="5" rx="24" ry="11"/><circle cx="-12" cy="0" r="11"/><circle cx="1" cy="-6" r="13"/><circle cx="13" cy="0" r="10.5"/></g><ellipse cy="5" rx="22" ry="9" ${tom("c0.62")}/><circle cx="-12" cy="0" r="9.5" ${tom("c0.62")}/><circle cx="1" cy="-6" r="11.5" ${tom("c0.62")}/><circle cx="13" cy="0" r="9" ${tom("c0.62")}/>`;
    fx.pensando =
      `<circle class="${p}-bolha0" cx="${bx - 34}" cy="${y0 + 2}" r="5.5" ${tom("c0.62")} ${tom("e0.12", "stroke")} stroke-width="2"/>` +
      `<circle class="${p}-bolha1" cx="${bx - 20}" cy="${(y0 + 2 + ny) / 2 + 4}" r="8.5" ${tom("c0.62")} ${tom("e0.12", "stroke")} stroke-width="2"/>` +
      `<g class="${p}-bolha2"><g transform="translate(${bx + 6} ${ny})"><g class="${p}-nuvem">${nuvem}${pontos}</g></g></g>`;
    pose.olhar = "translate(5 -6)";
  }

  if (tem("escrevendo")) {
    const gx = Math.min(x1 - 12, 206);
    const gy = y0 - 4;
    const pontos = [12, 22, 32]
      .map((x, i) => {
        css.push(`${em("escrevendo", "tecla" + i)}{${a("tecla", 0.8, -0.8 + i * 0.13)}}`);
        return `<circle class="${p}-tecla${i}" cx="${x}" cy="-12" r="3" ${tom("e0.25")}/>`;
      })
      .join("");
    fx.escrevendo = `<g transform="translate(${gx} ${gy})"><g class="${p}-balao"><path d="M8-6L2 6L18-3Z" ${tom("c0.55")}/><rect y="-24" width="44" height="24" rx="12" ${tom("c0.55")}/>${pontos}</g></g>`;
    pose.olhar = "translate(-3 6)";
    css.push(
      kf("le", "0%,100%{transform:translate(-5px,6px)}78%{transform:translate(4px,6px)}88%{transform:translate(4px,7px)}"),
      kf("digita", "0%,100%{transform:none}50%{transform:translateY(-2.5px) scale(1.01,.99)}"),
      kf("tecla", "0%,60%,100%{transform:none}30%{transform:translateY(-4px)}"),
      kf("balao", "0%,100%{transform:none}50%{transform:scale(1.04)}"),
      `${em("escrevendo", "corpo")}{${a("digita", 0.8)}}`,
      `${em("escrevendo", "olhar")}{${a("le", 1.6)}}`,
      `${em("escrevendo", "balao")}{${a("balao", 1.6)}}`,
    );
  }

  if (tem("sucesso")) {
    const cx = meioX;
    const cy = y0 + 22;
    const specs = ["c0.45", "e0.35", "c0.75", "e0.55"];
    let confete = "";
    for (let i = 0; i < 10; i++) {
      const ang = (-168 + i * (156 / 9)) * EM_GRAUS;
      const dist = 52 + (i % 3) * 12;
      const dx = n2(Math.cos(ang) * dist);
      const dy = n2(Math.sin(ang) * dist);
      const giro = (i % 2 ? 1 : -1) * (120 + i * 20);
      const peca =
        i % 2
          ? `<rect x="-4" y="-2" width="8" height="4" rx="1" ${tom(specs[i % 4])}/>`
          : `<circle r="3.2" ${tom(specs[i % 4])}/>`;
      const posicao = parado ? `translate(${n2(dx * 0.8)} ${n2(dy * 0.8)})` : "";
      confete += `<g transform="translate(${cx} ${cy}) ${posicao}"><g class="${p}-cf${i}">${peca}</g></g>`;
      css.push(
        kf(
          "cf" + i,
          `0%,10%{transform:scale(0);opacity:0}14%{transform:none;opacity:1}50%{transform:translate(${dx}px,${dy}px) rotate(${giro}deg);opacity:1}72%,100%{transform:translate(${n2(dx * 1.15)}px,${n2(dy + 26)}px) rotate(${giro * 1.6}deg) scale(.8);opacity:0}`,
        ),
        `${em("sucesso", "cf" + i)}{${a("cf" + i, 2, 0, "cubic-bezier(.2,.7,.3,1)")}}`,
      );
    }
    fx.sucesso = confete;
    css.push(
      kf(
        "pulo",
        "0%,68%,100%{transform:none}6%{transform:scale(1.12,.86)}20%{transform:translateY(-34px) scale(.92,1.09) rotate(-6deg)}32%{transform:translateY(-38px) rotate(6deg)}44%{transform:scale(1.12,.88)}52%{transform:translateY(-10px) scale(.97,1.03)}60%{transform:scale(1.04,.96)}",
      ),
      kf(
        "sombra-pulo",
        "0%,68%,100%{transform:none;opacity:.16}20%,32%{transform:scaleX(.55);opacity:.06}44%{transform:scaleX(1.12);opacity:.18}52%{transform:scaleX(.85);opacity:.12}",
      ),
      `${em("sucesso", "corpo")}{${a("pulo", 2)}}`,
      `${em("sucesso", "sombra")}{${a("sombra-pulo", 2)}}`,
      `${em("sucesso", "olhos")}{display:none}`,
      `${em("sucesso", "arcos")}{display:inline}`,
      `${em("sucesso", "sorriso")}{opacity:1;transform:none}`,
    );
  }

  if (tem("alerta")) {
    const linhas = `<path d="M0 0L-9-9M-4 9L-15 8" fill="none" ${tom("e0.15", "stroke")} stroke-width="3.6" stroke-linecap="round"/>`;
    fx.alerta =
      `<g transform="translate(${meioX} ${y0 - 18})"><g class="${p}-exclama"><rect x="-4" y="-18" width="8" height="20" rx="4" ${tom("e0.15")}/><circle cy="9" r="4.5" ${tom("e0.15")}/></g></g>` +
      `<g class="${p}-raio" transform="translate(${x0 + 16} ${y0 + 8})">${linhas}</g>` +
      `<g class="${p}-raio" transform="translate(${x1 - 16} ${y0 + 8}) scale(-1 1)">${linhas}</g>`;
    css.push(
      kf(
        "treme",
        "0%,30%,100%{transform:none}4%{transform:translateY(-8px) scale(.96,1.05)}9%{transform:translateX(-3px)}13%{transform:translateX(3px)}17%{transform:translateX(-3px)}21%{transform:translateX(3px)}25%{transform:translateX(-1.5px)}",
      ),
      kf("exclama", "0%{transform:scale(0) rotate(-20deg)}10%{transform:scale(1.25) rotate(8deg)}18%{transform:rotate(-4deg)}26%{transform:none}50%{transform:translateY(-3px)}100%{transform:none}"),
      kf("arregala", "0%{transform:none}6%{transform:scale(1.32)}14%,100%{transform:scale(1.18)}"),
      kf("raio", "0%,8%{opacity:0}14%,40%{opacity:1}55%,100%{opacity:0}"),
      `${em("alerta", "corpo")}{${a("treme", 1.6, 0, "linear")}}`,
      `${em("alerta", "olhar")}{${a("arregala", 1.6)}}`,
      `${em("alerta", "exclama")}{${a("exclama", 1.6)}}`,
      `${em("alerta", "raio")}{${a("raio", 1.6)}}`,
      `${em("alerta", "boca-o")}{opacity:1;transform:none}`,
    );
  }

  if (tem("erro")) {
    fx.erro =
      `<g transform="translate(${x0 + 24} ${y0 + 24})"><path class="${p}-suor" d="M0-8C-5-1-5 4 0 5C5 4 5-1 0-8Z" ${tom("c0.7")}/></g>` +
      `<g transform="translate(${Math.min(x1 - 26, 214)} ${y0 - 12})"><path class="${p}-rabisco" d="M-8 2C-4-8 8-6 6 2C4 9-8 7-5-1C-2-8 10-4 8 4" fill="none" ${tom("e0.4", "stroke")} stroke-width="2.6" stroke-linecap="round"/></g>`;
    pose.olhar = "translate(0 3)";
    css.push(
      kf(
        "chacoalha",
        "0%,30%,100%{transform:none}5%{transform:translateX(-7px) rotate(-3deg)}10%{transform:translateX(7px) rotate(3deg)}15%{transform:translateX(-5px)}20%{transform:translateX(5px)}25%{transform:translateX(-2px)}40%,90%{transform:scale(1.02,.97)}",
      ),
      kf("escurece", "0%,30%,100%{opacity:0}8%{opacity:.22}"),
      kf("abatido", "0%,25%{transform:none}38%,100%{transform:translateY(4px)}"),
      kf("pisca-triste", "0%,58%,74%,100%{transform:none}66%{transform:scaleY(.15)}"),
      kf("suor", "0%,20%{transform:none;opacity:0}30%{opacity:1}80%{transform:translate(-3px,14px);opacity:1}100%{transform:translate(-4px,18px);opacity:0}"),
      kf("gira", "from{transform:none}to{transform:rotate(360deg)}"),
      `${em("erro", "corpo")}{${a("chacoalha", 2)}}`,
      `${em("erro", "tinta")}{${a("escurece", 2)}}`,
      `${em("erro", "olhar")}{${a("abatido", 2)}}`,
      `${em("erro", "pisca")}{${a("pisca-triste", 2)}}`,
      `${em("erro", "suor")}{${a("suor", 2)}}`,
      `${em("erro", "rabisco")}{${a("gira", 2, 0, "linear")}}`,
      `${em("erro", "boca-onda")}{opacity:1;transform:none}`,
    );
  }

  if (tem("dormindo")) {
    const zx = Math.min(x1 - 28, 200);
    const zy = y0 + 4;
    let zs = "";
    [1, 0.8, 0.62].forEach((s, i) => {
      const subida = parado ? `translate(${i * 8} ${-i * 16})` : "";
      zs += `<g transform="translate(${zx} ${zy}) ${subida}"><g class="${p}-z${i}"><path transform="scale(${s})" d="M0 0H9L0 10H9" fill="none" ${tom("e0.15", "stroke")} stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g></g>`;
      css.push(`${em("dormindo", "z" + i)}{${a("zz", 5, (-5 * i) / 3, "ease-out")}}`);
    });
    fx.dormindo = zs;
    pose.corpo = "rotate(-3 128 220)";
    pose.olhar = "translate(0 4)";
    css.push(
      kf("ronca", "0%,100%{transform:rotate(-3deg)}45%{transform:rotate(-3deg) scale(1.04,.955)}70%{transform:rotate(-5deg) translateY(2px) scale(1.02,.98)}78%{transform:rotate(-2deg)}"),
      kf("sombra-ronca", "0%,100%{transform:none}50%{transform:scaleX(1.06)}"),
      kf("boca-ronca", "0%,100%{transform:scale(.7)}50%{transform:scale(1.15)}"),
      kf("zz", "0%{transform:none;opacity:0}15%{opacity:1}50%{transform:translate(12px,-22px) rotate(8deg)}85%{opacity:.8}100%{transform:translate(18px,-46px) rotate(-6deg);opacity:0}"),
      `${em("dormindo", "corpo")}{${a("ronca", 5)}}`,
      `${em("dormindo", "sombra")}{${a("sombra-ronca", 5)}}`,
      `${em("dormindo", "olhar")}{transform:translateY(4px)}`,
      `${em("dormindo", "olhos")}{display:none}`,
      `${em("dormindo", "fechados")}{display:inline}`,
      `${em("dormindo", "boca-o")}{opacity:1;${a("boca-ronca", 5)}}`,
      `${em("dormindo", "ronco")}{display:inline;${a("ronco", 5)}}`,
      kf("ronco", "0%{transform:scale(0);opacity:0}8%{opacity:.8}66%{transform:scale(1.6);opacity:.8}70%{transform:scale(1.9);opacity:0}100%{transform:scale(0);opacity:0}"),
    );
  }

  // ---------- montagem ----------

  const s = f.olho.escala;
  const olhos = olhosDoDot(dot);
  let conjuntoOlhos: string;
  if (parado) {
    const qual = estado === "sucesso" ? olhos.arcos : estado === "dormindo" ? olhos.fechados : olhos.olhos;
    conjuntoOlhos = `<g class="${p}-olhos">${qual}</g>`;
  } else {
    conjuntoOlhos =
      `<g class="${p}-olhos">${olhos.olhos}</g>` +
      (tem("dormindo") ? `<g class="${p}-fechados">${olhos.fechados}</g>` : "") +
      (tem("sucesso") ? `<g class="${p}-arcos">${olhos.arcos}</g>` : "");
  }

  const traco = (d: string, w: number) =>
    `<path d="${d}" fill="none" stroke="${tinta.T}" stroke-width="${w}" stroke-linecap="round"/>`;
  const bocas: [EstadoId, string, string][] = [
    [
      "sucesso",
      "sorriso",
      // Mesma tinta dos olhos e cantos redondos, pra boca parecer do mesmo desenho que eles.
      `<path d="M-7-1.5Q0 .5 7-1.5Q6.4 6.6 0 7.2Q-6.4 6.6-7-1.5Z" fill="${tinta.T}" stroke="${tinta.T}" stroke-width="1.6" stroke-linejoin="round"/>`,
    ],
    ["erro", "boca-onda", traco("M-9 2Q-4.5-3.5 0 2T9 2", 4.2)],
    ["alerta", "boca-o", `<ellipse rx="3.6" ry="4.2" fill="${tinta.T}"/>`],
    ["dormindo", "boca-o", `<ellipse rx="3.6" ry="4.2" fill="${tinta.T}"/>`],
  ];
  // Bolha de ronco: mora junto da boca (anda com o rosto) e só existe na versão animada.
  const ronco =
    animado && tem("dormindo")
      ? `<circle class="${p}-ronco" cx="11" cy="-1" r="5" fill="#fff" fill-opacity=".55" ${tom("e0.12", "stroke")} stroke-width="1.2" style="display:none;transform-box:view-box;transform-origin:6px -1px"/>`
      : "";
  const vistas = new Set<string>();
  let boca = "";
  for (const [est, nome, desenho] of bocas) {
    if (!tem(est) || vistas.has(nome) || (parado && est !== estado)) continue;
    vistas.add(nome);
    boca += `<g class="${p}-boca ${p}-${nome}">${desenho}</g>`;
  }
  const desenharBochechas = (classe = "") =>
    [-1, 1]
      .map((l) => `<ellipse${classe} cx="${l * (vaoDo(f, dot) + 11 * s)}" cy="${11 * s}" rx="${7.5 * s}" ry="${4.5 * s}" ${tom("r0.5")} opacity=".6"/>`)
      .join("");
  // No sucesso o dot fica corado, mesmo com as bochechas desligadas.
  let bochechas = "";
  if (o.bochechas) bochechas = desenharBochechas();
  else if (tem("sucesso") && (animado || estado === "sucesso")) {
    bochechas = desenharBochechas(animado ? ` class="${p}-rubor"` : "");
    if (animado) css.push(`.${p}-rubor{opacity:0;transition:opacity .3s}`, `${em("sucesso", "rubor")}{opacity:.6}`);
  }

  const rosto =
    `<g class="${p}-rosto" transform="translate(${f.olho.x + (dot.olhoX ?? 0)} ${f.olho.y + (dot.olhoY ?? 0)})">` +
    bochechas +
    `<g class="${p}-olhar"${parado && pose.olhar ? ` transform="${pose.olhar}"` : ""}><g class="${p}-segue"><g class="${p}-pisca">${conjuntoOlhos}</g></g></g>` +
    `<g transform="translate(0 ${20 * s}) scale(${s})">${boca}${ronco}</g>` +
    `</g>`;

  const pele =
    `<g class="${p}-pele"><path d="${f.d}" ${tom("b")}/>` +
    (f.detalhe ? f.detalhe((spec, attr) => tom(spec, attr)) : "") +
    (tem("erro") && animado ? `<path class="${p}-tinta" d="${f.d}" fill="#1e1b18"/>` : "") +
    `</g>`;

  const sombra =
    o.sombra === false
      ? ""
      : `<ellipse class="${p}-sombra" cx="${meioX}" cy="${y1 + 8}" rx="${n2((x1 - x0) * 0.36)}" ry="7" fill="#1e1b18"${parado ? ' opacity=".16"' : ""}/>`;

  const efeitos = estados
    .filter((e) => fx[e])
    .map((e) => `<g class="${p}-fx ${p}-fx-${e}">${fx[e]}</g>`)
    .join("");

  const corpoPose = parado && pose.corpo ? ` transform="${pose.corpo}"` : "";
  const tam = o.tamanho ? ` width="${o.tamanho}" height="${o.tamanho}"` : "";
  const rotulo = o.rotulo ?? `Dot ${f.nome.toLowerCase()}, ${estadoPorId(estado).nome.toLowerCase()}`;
  const fundo = o.fundo ? `<rect width="256" height="256" fill="${o.fundo}"/>` : "";

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${o.recortado ? `${meioX - 106} ${meioY - 104} 212 212` : "0 0 256 256"}"${tam} class="${p}" data-estado="${estado}" role="img" aria-label="${rotulo}">` +
    fundo +
    sombra +
    `<g class="${p}-corpo"${corpoPose}><g class="${p}-jeito">${pele}${o.semRosto ? "" : rosto}</g></g>` +
    efeitos +
    `</svg>`;
  return { svg, css: css.join("") };
}

/** Troca a cor de um dot vivo sem refazer o SVG: cada [data-tom] guarda a receita do seu tom. */
export function recolorir(svg: SVGSVGElement, cor: string) {
  svg.querySelectorAll<SVGElement>("[data-tom]").forEach((el) => {
    const [attr, spec] = el.dataset.tom!.split(":");
    el.setAttribute(attr, resolverTom(cor, spec));
  });
}
