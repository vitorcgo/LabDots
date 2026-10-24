import { luminancia } from "../lib/cor";
import { ESTADOS, estadoPorId, type EstadoId } from "../lib/estados";
import { EXPRESSOES } from "../lib/expressoes";
import { FORMATOS, formatoPorId } from "../lib/formatos";
import { LIMITE_OLHAR, gerarDot, olhosDoDot, partesDoDot, recolorir, tintaDosOlhos, type Dot } from "../lib/gerador";
import { AMOSTRAS, nomeDaCor } from "../lib/paleta";
import { avisar } from "./avisos";
import {
  baixar,
  copiarPng,
  copiarTexto,
  folha,
  gifDoEstado,
  nomeDoArquivo,
  pngDoEstado,
  svgDoEstado,
  svgUnico,
  zipDoDot,
  zipDoTime,
} from "./exportar";
import { iniciarLeque } from "./leque";
import { LIMITE_TIME, loja } from "./loja";
import { fecharAberto, marcar, popover } from "./menus";
import { iniciarFundo } from "./fundo";

const $ = <T extends HTMLElement = HTMLElement>(s: string, raiz: ParentNode = document) => raiz.querySelector<T>(s)!;
const $$ = <T extends HTMLElement = HTMLElement>(s: string, raiz: ParentNode = document) => [...raiz.querySelectorAll<T>(s)];
const sorteio = <T>(lista: T[]) => lista[Math.floor(Math.random() * lista.length)];
const modoAnel = matchMedia("(min-width: 768px) and (min-height: 700px)");
const MOLA = "cubic-bezier(.34,1.56,.64,1)";

loja.iniciar();
const fundo = iniciarFundo($<HTMLCanvasElement>("#fundo"), $("#dot-vivo"));

// CSS dentro de um SVG embutido vale pra página toda, e cada <style> novo faz o navegador recalcular
// o estilo de tudo. Por isso os dots que dividem um prefixo ganham um <style> só, trocado só quando muda.
const estilos = new Map<string, HTMLStyleElement>();
function estiloCompartilhado(nome: string, css: string) {
  let el = estilos.get(nome);
  if (!el) {
    el = document.createElement("style");
    document.head.append(el);
    estilos.set(nome, el);
  }
  if (el.textContent !== css) el.textContent = css;
}

// ---------- dot vivo ----------

const vivo = $<HTMLButtonElement>("#dot-vivo");
const svgVivo = () => vivo.querySelector<SVGSVGElement>("svg")!;
let tintaOlhos = "";

function opcoesBase() {
  const a = loja.ajustes;
  return { bochechas: a.bochechas, sombra: a.sombra, velocidade: a.velocidade };
}

// Com cor de olho escolhida, a tinta não depende do corpo; sem ela, muda quando o corpo é muito escuro.
const tintaDe = (d: Dot) => d.corOlho ?? (luminancia(d.cor) < 0.2 ? "claro" : "escuro");

function desenharVivo(extra: Partial<Dot> = {}) {
  const dot = { ...loja.dot, ...extra };
  // O CSS do dot vivo é igual em todo formato; só é trocado quando velocidade, sombra ou bochechas mudam.
  const { svg, css } = partesDoDot(dot, { ...opcoesBase(), prefixo: "vivo", vivo: true, estado: loja.estado, rotulo: "Seu dot" });
  estiloCompartilhado("vivo", css);
  vivo.innerHTML = svg;
  tintaOlhos = tintaDe(dot);
}

/** Troca só os grupos de olhos de um SVG já desenhado, sem refazer o resto. */
function trocarOlhosEm(svg: Element | null, prefixo: string, dot: Dot, o = olhosDoDot(dot)) {
  if (!svg) return;
  const olhos = svg.querySelector(`.${prefixo}-olhos`);
  // No desenho parado de Sucesso e Dormindo, o grupo "olhos" guarda os arcos ou os fechados: esses não mudam.
  const estado = svg.getAttribute("data-estado");
  const parado = !svg.querySelector(`.${prefixo}-arcos, .${prefixo}-fechados`);
  if (olhos && !(parado && (estado === "sucesso" || estado === "dormindo"))) olhos.innerHTML = o.olhos;
  const fechados = svg.querySelector(`.${prefixo}-fechados`);
  if (fechados) fechados.innerHTML = o.fechados;
  const arcos = svg.querySelector(`.${prefixo}-arcos`);
  if (arcos) arcos.innerHTML = o.arcos;
}

const trocarOlhos = (dot: Dot) => trocarOlhosEm(svgVivo(), "vivo", dot);

/** Pinta o dot vivo com outra cor sem refazer o SVG, pra transição de cor ficar suave. */
function pintarVivo(cor: string, previa = false) {
  // Na prova só o dot do meio muda: mexer na variável do body faz a página inteira recalcular estilo.
  if (!previa) document.body.style.setProperty("--cor-dot", cor);
  // Cor escura pede olhos de outra tinta. Na prova basta trocar os olhos; ao escolher, refaz o SVG.
  if (!previa && tintaDe({ ...loja.dot, cor }) !== tintaOlhos) return desenharVivo({ cor });
  recolorir(svgVivo(), cor);
  trocarOlhos({ ...loja.dot, cor });
}

function amassar(el: Element, forte = 1) {
  el.animate(
    [
      { transform: "scale(1)" },
      { transform: `scale(${1 + 0.14 * forte},${1 - 0.16 * forte})` },
      { transform: `scale(${1 - 0.06 * forte},${1 + 0.07 * forte})` },
      { transform: "scale(1)" },
    ],
    { duration: 460, easing: "ease-out" },
  );
}

function trocarFormatoComEfeito() {
  vivo.style.transformOrigin = "50% 88%";
  vivo.animate([{ transform: "scale(1)" }, { transform: "scale(1.3,.4)", opacity: 0 }], { duration: 150, easing: "ease-in" }).onfinish = () => {
    desenharVivo();
    vivo.animate(
      [
        { transform: "scale(.5,1.4)", opacity: 0 },
        { transform: "scale(1.12,.9)", opacity: 1, offset: 0.55 },
        { transform: "scale(.97,1.03)", offset: 0.8 },
        { transform: "scale(1)" },
      ],
      { duration: 520, easing: "ease-out" },
    );
  };
}

// Cutucar: o dot dá um pulinho e sorri.
let fimSorriso = 0;
let arrastou = false;
vivo.addEventListener("click", () => {
  // O clique que fecha um arraste de olhos não é cutucada.
  if (arrastou) return void (arrastou = false);
  vivo.style.transformOrigin = "50% 88%";
  vivo.animate(
    [
      { transform: "none" },
      { transform: "scale(1.08,.9)", offset: 0.14 },
      { transform: "translateY(-22px) scale(.95,1.06)", offset: 0.42 },
      { transform: "scale(1.06,.94)", offset: 0.72 },
      { transform: "none" },
    ],
    { duration: 560, easing: "ease-out" },
  );
  const svg = svgVivo();
  svg.dataset.feliz = "";
  clearTimeout(fimSorriso);
  fimSorriso = window.setTimeout(() => delete svgVivo().dataset.feliz, 1100);
});

// Arrastar o rosto: olhos e boca vão junto com o ponteiro, até o limite de cada lado.
let arraste: { x: number; y: number; ox: number; oy: number; escala: number; movendo: boolean } | null = null;
const limitar = (v: number) => Math.round(Math.max(-LIMITE_OLHAR, Math.min(LIMITE_OLHAR, v)));
const posicaoArraste = (e: PointerEvent) => ({
  olhoX: limitar(arraste!.ox + (e.clientX - arraste!.x) * arraste!.escala),
  olhoY: limitar(arraste!.oy + (e.clientY - arraste!.y) * arraste!.escala),
});

function moverRosto(ox: number, oy: number) {
  const f = formatoPorId(loja.dot.formato);
  svgVivo().querySelector(".vivo-rosto")?.setAttribute("transform", `translate(${f.olho.x + ox} ${f.olho.y + oy})`);
}

vivo.addEventListener("pointerdown", (e) => {
  arraste = {
    x: e.clientX,
    y: e.clientY,
    ox: loja.dot.olhoX ?? 0,
    oy: loja.dot.olhoY ?? 0,
    escala: 256 / vivo.getBoundingClientRect().width,
    movendo: false,
  };
});
vivo.addEventListener("pointermove", (e) => {
  if (!arraste) return;
  if (!arraste.movendo) {
    if (Math.hypot(e.clientX - arraste.x, e.clientY - arraste.y) < 5) return;
    arraste.movendo = true;
    vivo.setPointerCapture(e.pointerId);
  }
  const { olhoX, olhoY } = posicaoArraste(e);
  moverRosto(olhoX, olhoY);
});
vivo.addEventListener("pointerup", (e) => {
  if (arraste?.movendo) {
    arrastou = true;
    loja.mudarDot(posicaoArraste(e), "olhos");
  }
  arraste = null;
});
vivo.addEventListener("pointercancel", () => {
  arraste = null;
  moverRosto(loja.dot.olhoX ?? 0, loja.dot.olhoY ?? 0);
});
// Pelo teclado: setas movem os olhos (Shift anda mais).
vivo.addEventListener("keydown", (e) => {
  const passo = e.shiftKey ? 6 : 2;
  const d = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] }[e.key];
  if (!d) return;
  e.preventDefault();
  loja.mudarDot({ olhoX: limitar((loja.dot.olhoX ?? 0) + d[0]), olhoY: limitar((loja.dot.olhoY ?? 0) + d[1]) }, "olhos");
});
$("#centralizar").addEventListener("click", () => loja.mudarDot({ olhoX: 0, olhoY: 0 }, "olhos"));
$("#rosto-padrao").addEventListener("click", () =>
  loja.mudarDot({ olhoX: 0, olhoY: 0, vaoOlho: 0, larguraOlho: 1, corOlho: undefined }, "olhos"),
);
popover($("#abrir-rosto"), $("#rosto"));
// Arrastando o controle, o dot do meio acompanha; ao soltar, grava (vai pro link, time e exportação).
const vaoOlho = $<HTMLInputElement>("#vao-olho");
const larguraOlho = $<HTMLInputElement>("#largura-olho");
for (const [campo, chave] of [
  [vaoOlho, "vaoOlho"],
  [larguraOlho, "larguraOlho"],
] as const) {
  campo.addEventListener("input", () => desenharVivo({ [chave]: Number(campo.value) }));
  campo.addEventListener("change", () => loja.mudarDot({ [chave]: Number(campo.value) }, "olhos"));
}

// Olhos seguem o ponteiro (só mouse; no toque não existe "olhar pra onde o dedo está").
let olhar = 0;
addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse" || !loja.ajustes.seguir || olhar) return;
  const { clientX, clientY } = e;
  // Uma leitura de layout por quadro, não uma por evento.
  olhar = requestAnimationFrame(() => {
    olhar = 0;
    const r = vivo.getBoundingClientRect();
    const dx = clientX - (r.left + r.width / 2);
    const dy = clientY - (r.top + r.height * 0.45);
    const dist = Math.hypot(dx, dy) || 1;
    const k = Math.min(6, dist / 40) / dist;
    const svg = svgVivo();
    svg.style.setProperty("--ox", `${(dx * k).toFixed(2)}px`);
    svg.style.setProperty("--oy", `${(dy * k).toFixed(2)}px`);
  });
});

// ---------- grupos de rádio (setas movem e escolhem) ----------

function grupoRadio(grupo: HTMLElement, aoEscolher: (el: HTMLElement) => void) {
  grupo.addEventListener("keydown", (e) => {
    const lista = $$('[role="radio"]', grupo);
    const i = lista.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    const passo = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!passo) return;
    e.preventDefault();
    const alvo = lista[(i + passo + lista.length) % lista.length];
    alvo.focus();
    aoEscolher(alvo);
  });
}

// ---------- anel de expressões ----------

const anel = $("#anel");
const itensAnel = $$<HTMLButtonElement>("[data-expressao]", anel);


let tintaAnel = "";
let loteAnel = 0;
/** Com `aos poucos`, refaz alguns bonecos por quadro em vez dos 25 de uma vez. */
function desenharAnel(aosPoucos = false) {
  // Desenho parado (quem respira é o <span> em volta) e com data-tom, pra dar pra recolorir.
  const op = { prefixo: "anel", vivo: true, animado: false, sombra: false, recortado: true } as const;
  const dot = { ...loja.dot };
  const lote = ++loteAnel;
  const desenhar = (b: HTMLButtonElement, i: number) => {
    b.innerHTML = `<span>${gerarDot({ ...dot, expressao: b.dataset.expressao! }, op)}</span>`;
    // Cada boneco num ponto do ciclo, pra não respirarem todos juntos.
    b.style.setProperty("--fase", `${(i * 0.83).toFixed(2)}s`);
  };
  tintaAnel = tintaDe(dot);
  if (!aosPoucos) return itensAnel.forEach(desenhar);
  let i = 0;
  const passo = () => {
    // Uma mudança nova no meio do caminho cancela este lote.
    if (lote !== loteAnel) return;
    for (const fim = Math.min(i + 5, itensAnel.length); i < fim; i++) desenhar(itensAnel[i], i);
    if (i < itensAnel.length) requestAnimationFrame(passo);
  };
  passo();
}

// Uma piscada por vez, num boneco sorteado do anel ou do time. Sai bem mais barato que 25 animações rodando.
setInterval(() => {
  if (document.hidden) return;
  const olhos = $$<SVGGElement>(".anel-item .anel-pisca, #lista-time [class$='-pisca']");
  const g = olhos[Math.floor(Math.random() * olhos.length)];
  if (!g) return;
  g.style.transformBox = "fill-box";
  g.style.transformOrigin = "center";
  g.animate([{ transform: "none" }, { transform: "scaleY(.1)" }, { transform: "none" }], { duration: 180, easing: "ease-in-out" });
}, 650);

function recolorirMiniaturas(cor: string) {
  for (const b of [...itensAnel, ...itensForma]) {
    const svg = b.querySelector<SVGSVGElement>("svg");
    if (svg) recolorir(svg, cor);
  }
}

function entrarAnel() {
  if (!modoAnel.matches) return;
  const meio = (itensAnel.length - 1) / 2;
  itensAnel.forEach((b, i) => {
    b.classList.add("entrando");
    setTimeout(() => b.classList.remove("entrando"), 120 + Math.abs(i - meio) * 28);
  });
}

function escolherExpressao(b: HTMLElement) {
  const id = b.dataset.expressao!;
  if (id === loja.dot.expressao) return;
  vivo.style.transformOrigin = "50% 88%";
  amassar(vivo, 0.7);
  b.querySelector("span")?.animate(
    [{ transform: "none" }, { transform: "translateY(-10px) scale(.92,1.1)" }, { transform: "scale(1.08,.92)" }, { transform: "none" }],
    { duration: 420, easing: "ease-out" },
  );
  loja.mudarDot({ expressao: id }, "expressao");
}

itensAnel.forEach((b) => {
  b.addEventListener("click", () => escolherExpressao(b));
});
grupoRadio(anel, escolherExpressao);

// Lupa no anel: os bonecos perto do cursor crescem e se afastam do centro.
let centros: { b: HTMLElement; x: number; y: number }[] = [];
anel.addEventListener("pointerenter", () => {
  centros = itensAnel.map((b) => {
    const r = b.getBoundingClientRect();
    return { b, x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
});
anel.addEventListener("pointermove", (e) => {
  if (!modoAnel.matches || e.pointerType !== "mouse") return;
  for (const c of centros) {
    const k = Math.max(0, 1 - Math.hypot(e.clientX - c.x, e.clientY - c.y) / 100);
    c.b.style.setProperty("--zoom", (1 + 0.22 * k).toFixed(3));
    c.b.style.setProperty("--empurra", `${(8 * k).toFixed(1)}px`);
    // O mais perto do cursor fica por cima, senão o vizinho crescido rouba o clique.
    c.b.style.zIndex = String(Math.round(k * 10));
  }
});
anel.addEventListener("pointerleave", () => {
  itensAnel.forEach((b) => {
    b.style.removeProperty("--zoom");
    b.style.removeProperty("--empurra");
    b.style.zIndex = "";
  });
});

// ---------- carrossel de formatos ----------

const carrossel = $("#carrossel");
const itensForma = $$<HTMLButtonElement>("[data-formato]", carrossel);
const nomeFormato = $("#nome-formato");

function desenharCarrossel() {
  itensForma.forEach((b) => {
    b.innerHTML = gerarDot({ ...loja.dot, formato: b.dataset.formato! }, { animado: false, vivo: true, sombra: false, semRosto: true, recortado: true });
  });
}

function posicionarCarrossel() {
  const n = itensForma.length;
  const atual = FORMATOS.findIndex((f) => f.id === loja.dot.formato);
  const largura = carrossel.offsetWidth;
  const passo = Math.min(84, largura / 6.5);
  itensForma.forEach((b, i) => {
    let off = i - atual;
    if (off > n / 2) off -= n;
    if (off < -n / 2) off += n;
    const longe = Math.abs(off);
    const anterior = Number(b.dataset.off ?? off);
    // Item que dá a volta inteira some sem atravessar a tela.
    b.style.transition = Math.abs(anterior - off) > n / 2 ? "none" : "";
    b.dataset.off = String(off);
    b.style.transform = `translateX(${off * passo}px) translateY(${-longe * longe * 3}px) rotate(${off * 6}deg) scale(${1 - longe * 0.13})`;
    b.style.opacity = longe > 3 ? "0" : String(1 - longe * 0.24);
    b.style.zIndex = String(10 - longe);
    b.style.pointerEvents = longe > 3 ? "none" : "";
    b.tabIndex = off === 0 ? 0 : -1;
    b.setAttribute("aria-checked", String(off === 0));
  });
  nomeFormato.textContent = formatoPorId(loja.dot.formato).nome;
}

function escolherFormato(id: string) {
  if (id === loja.dot.formato) return;
  loja.mudarDot({ formato: id }, "formato");
}

function andarFormato(passo: number) {
  const i = FORMATOS.findIndex((f) => f.id === loja.dot.formato);
  escolherFormato(FORMATOS[(i + passo + FORMATOS.length) % FORMATOS.length].id);
}

itensForma.forEach((b) => b.addEventListener("click", () => escolherFormato(b.dataset.formato!)));
carrossel.addEventListener("keydown", (e) => {
  const passo = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
  if (!passo) return;
  e.preventDefault();
  andarFormato(passo);
  requestAnimationFrame(() => $<HTMLButtonElement>('[aria-checked="true"]', carrossel).focus());
});
// Arrastar pro lado troca o formato (no toque e no mouse).
let inicioArraste: number | null = null;
carrossel.addEventListener("pointerdown", (e) => (inicioArraste = e.clientX));
carrossel.addEventListener("pointerup", (e) => {
  if (inicioArraste === null) return;
  const dx = e.clientX - inicioArraste;
  inicioArraste = null;
  if (Math.abs(dx) > 36) andarFormato(dx < 0 ? 1 : -1);
});
let ultimaRoda = 0;
carrossel.addEventListener(
  "wheel",
  (e) => {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY) || Math.abs(e.deltaX) < 8) return;
    e.preventDefault();
    if (performance.now() - ultimaRoda < 260) return;
    ultimaRoda = performance.now();
    andarFormato(e.deltaX > 0 ? 1 : -1);
  },
  { passive: false },
);
addEventListener("resize", posicionarCarrossel);

// ---------- estados ----------

const grupoEstados = $("#estados");
const abasEstado = $$<HTMLButtonElement>("button[data-estado]", grupoEstados);

function desenharEstados() {
  abasEstado.forEach((b) => {
    const id = b.dataset.estado as EstadoId;
    const ativo = id === loja.estado;
    // Só a aba escolhida anima; as outras ficam paradas mostrando a pose do estado.
    const partes = partesDoDot(loja.dot, {
      ...opcoesBase(),
      sombra: false,
      estado: id,
      estados: [id],
      animado: ativo,
      recortado: true,
      prefixo: "aba",
    });
    if (ativo) estiloCompartilhado("aba", partes.css);
    $("[data-mini]", b).innerHTML = partes.svg;
  });
  marcar(abasEstado, (b) => b.dataset.estado === loja.estado);
  $$("[data-titulo-estado]").forEach((el) => (el.textContent = estadoPorId(loja.estado).nome));
}

function escolherEstado(b: HTMLElement) {
  const id = b.dataset.estado as EstadoId;
  if (id === loja.estado) return;
  amassar(b, 0.5);
  loja.mudarEstado(id);
}
abasEstado.forEach((b) => b.addEventListener("click", () => escolherEstado(b)));
grupoRadio(grupoEstados, escolherEstado);

// ---------- cor ----------

const botaoCor = $<HTMLButtonElement>("#botao-cor");
const botaoOlho = $<HTMLButtonElement>("#botao-olho");
const leque = iniciarLeque($("#leque"), {
  aoProvar(cor, alvo) {
    if (alvo === "olhos") {
      return desenharVivo({ corOlho: cor === null ? loja.dot.corOlho : cor === "auto" ? undefined : cor });
    }
    // Provar a cor mexe só no dot do meio; as miniaturas pegam a cor quando ela é escolhida.
    pintarVivo(cor ?? loja.dot.cor, true);
  },
  aoEscolher(cor, alvo) {
    if (alvo === "olhos") {
      amassar(botaoOlho, 0.8);
      return loja.mudarDot({ corOlho: cor === "auto" ? undefined : cor.toLowerCase() }, "olhos");
    }
    amassar(botaoCor, 0.8);
    loja.mudarDot({ cor: cor.toLowerCase() }, "cor");
  },
});
leque.ligar(botaoCor, "corpo");
leque.ligar(botaoOlho, "olhos");

// ---------- time ----------

const listaTime = $("#lista-time");
const botaoSalvar = $<HTMLButtonElement>("#salvar");

function desenharTime() {
  listaTime.innerHTML = "";
  loja.time.forEach((m, i) => {
    const li = document.createElement("li");
    li.className = "group relative shrink-0";
    const abrir = document.createElement("button");
    abrir.type = "button";
    abrir.className = "aperta respira grid size-12 place-items-center rounded-2xl p-1 hover:bg-superficie/70 [&_svg]:size-full";
    abrir.style.setProperty("--fase", `${(i * 1.3).toFixed(1)}s`);
    abrir.setAttribute("aria-label", `Abrir ${formatoPorId(m.formato).nome.toLowerCase()} ${nomeDaCor(m.cor).toLowerCase()}`);
    abrir.innerHTML = `<span>${gerarDot(m, { prefixo: `t${i}`, animado: false, sombra: false, recortado: true })}</span>`;
    abrir.addEventListener("click", () => {
      const { id, ...dot } = m;
      loja.mudarDot({ corOlho: undefined, olhoX: 0, olhoY: 0, vaoOlho: 0, larguraOlho: 1, ...dot }, "formato");
      amassar(abrir, 0.8);
    });
    const tirar = document.createElement("button");
    tirar.type = "button";
    tirar.className =
      "absolute -top-1 -right-1 grid size-5 scale-75 place-items-center rounded-full bg-tinta text-papel opacity-0 ring-2 ring-superficie transition duration-200 ease-mola group-hover:scale-100 group-hover:opacity-100 focus-visible:scale-100 focus-visible:opacity-100 pointer-coarse:scale-100 pointer-coarse:opacity-100 after:absolute after:-inset-3";
    tirar.setAttribute("aria-label", "Tirar do time");
    tirar.innerHTML = '<svg viewBox="0 0 24 24" class="size-2.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>';
    tirar.addEventListener("click", () => {
      li.animate([{ transform: "scale(1)" }, { transform: "scale(0)", opacity: 0 }], { duration: 200, easing: "ease-in" }).onfinish = () =>
        loja.tirarDoTime(m.id);
    });
    li.append(abrir, tirar);
    listaTime.append(li);
  });
  const n = loja.time.length;
  $$("[data-titulo-time]").forEach((el) => (el.textContent = n ? `${n} ${n === 1 ? "dot" : "dots"}` : "nenhum dot salvo"));
  $$<HTMLButtonElement>("[data-precisa-time]").forEach((b) => (b.disabled = n === 0));
  botaoSalvar.disabled = n >= LIMITE_TIME;
  botaoSalvar.title = n >= LIMITE_TIME ? `O time já tem ${LIMITE_TIME} dots` : "Salvar no time";
}

function desenharPrevia() {
  $("#previa-salvar").innerHTML = gerarDot(loja.dot, { animado: false, sombra: false, recortado: true });
}

botaoSalvar.addEventListener("click", () => {
  const r = loja.salvarNoTime();
  if (r === "repetido") return void avisar("Esse dot já está no time");
  if (r === "cheio") return void avisar(`O time já tem ${LIMITE_TIME} dots. Tire um pra abrir espaço`, "erro");
  const novo = listaTime.lastElementChild;
  if (novo) {
    novo.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], { duration: 450, easing: MOLA });
  }
  amassar(vivo, 0.6);
});

// ---------- me surpreenda ----------

$("#surpresa").addEventListener("click", () => {
  $("#dado").animate([{ transform: "rotate(0)" }, { transform: "rotate(720deg)" }], { duration: 700, easing: "cubic-bezier(.2,.8,.2,1)" });
  let voltas = 0;
  // Sorteia rápido algumas vezes antes de parar, como dado rolando.
  const rolar = () => {
    loja.mudarDot(
      {
        formato: sorteio(FORMATOS).id,
        expressao: sorteio(EXPRESSOES).id,
        cor: sorteio(AMOSTRAS.slice(0, 14)).hex,
        corOlho: undefined,
        olhoX: 0,
        olhoY: 0,
        vaoOlho: 0,
        larguraOlho: 1,
      },
      voltas < 5 ? "rolando" : "formato",
    );
    if (++voltas <= 5) setTimeout(rolar, 60 + voltas * 22);
  };
  rolar();
});

// ---------- ajustes ----------

popover($("#abrir-ajustes"), $("#ajustes"));

function aplicarAjustes() {
  const a = loja.ajustes;
  document.documentElement.dataset.tema = a.tema;
  marcar($$('[data-grupo="tema"] [role="radio"]'), (b) => b.dataset.valor === a.tema);
  marcar($$('[data-grupo="velocidade"] [role="radio"]'), (b) => Number(b.dataset.valor) === a.velocidade);
  $$<HTMLElement>('[role="switch"][data-chave]').forEach((b) => b.setAttribute("aria-checked", String(a[b.dataset.chave as "seguir"])));
  marcar($$("[data-png]"), (b) => Number(b.dataset.png) === a.tamanhoPng);
  marcar($$("[data-estilo]"), (b) => b.dataset.estilo === a.estilo);
  marcar($$("[data-fundo-gif]"), (b) => b.dataset.fundoGif === a.fundoGif);
  if (!a.seguir) {
    svgVivo().style.removeProperty("--ox");
    svgVivo().style.removeProperty("--oy");
  }
  fundo.redesenhar();
}

$$('[data-grupo="tema"] [role="radio"]').forEach((b) => b.addEventListener("click", () => loja.mudarAjuste("tema", b.dataset.valor as "claro")));
$$('[data-grupo="velocidade"] [role="radio"]').forEach((b) =>
  b.addEventListener("click", () => loja.mudarAjuste("velocidade", Number(b.dataset.valor))),
);
$$<HTMLElement>('[role="switch"][data-chave]').forEach((b) =>
  b.addEventListener("click", () => {
    const chave = b.dataset.chave as "seguir" | "bochechas" | "sombra";
    loja.mudarAjuste(chave, !loja.ajustes[chave]);
  }),
);

// ---------- exportação ----------

popover($("#abrir-exportar"), $("#menu-exportar"));

const dialogoCodigo = $<HTMLDialogElement>("#dialogo-codigo");
$("#abrir-codigo").addEventListener("click", () => {
  const ids = ESTADOS.map((e) => `"${e.id}"`).join(" | ");
  $("#exemplo-uso").textContent =
    `<!-- cole o SVG no HTML e troque o estado -->\nconst dot = document.querySelector("svg.dot");\ndot.dataset.estado = "pensando"; // ${ids}`;
  $<HTMLTextAreaElement>("#codigo-svg").value = svgUnico(loja.dot, loja.ajustes);
  dialogoCodigo.showModal();
});

$$<HTMLDialogElement>("dialog").forEach((d) => {
  $$("[data-fechar]", d).forEach((b) => b.addEventListener("click", () => d.close()));
  // Clique no fundo escuro fecha.
  d.addEventListener("click", (e) => e.target === d && d.close());
});

async function comProgresso(texto: string, tarefa: (aoAvancar: (p: number) => void) => Promise<Blob>, nome: string) {
  const aviso = avisar(texto, "carregando");
  try {
    const blob = await tarefa((p) => {
      aviso.progresso(p);
      aviso.texto(`${texto} ${Math.round(p * 100)}%`);
    });
    baixar(blob, nome);
    aviso.fechar();
    avisar(`${nome} baixado`);
  } catch (erro) {
    aviso.fechar();
    avisar("Não deu pra gerar o arquivo. Tente de novo", "erro");
    console.error(erro);
  }
}

async function copiar(texto: string, aviso: string) {
  try {
    await copiarTexto(texto);
    avisar(aviso);
  } catch {
    avisar("O navegador bloqueou a área de transferência", "erro");
  }
}

const acoes: Record<string, () => void | Promise<void>> = {
  async "copiar-png"() {
    const { tamanhoPng } = loja.ajustes;
    const png = pngDoEstado(loja.dot, loja.estado, tamanhoPng, loja.ajustes);
    try {
      await copiarPng(png);
      avisar(`PNG ${tamanhoPng} px copiado`);
    } catch {
      // Sem permissão pra copiar imagem: entrega o arquivo em vez de falhar calado.
      baixar(await png, `${nomeDoArquivo(loja.dot)}-${loja.estado}-${tamanhoPng}.png`);
      avisar("Seu navegador não copia imagem, então baixei o PNG");
    }
  },
  "copiar-svg": () => copiar(svgDoEstado(loja.dot, loja.estado, loja.ajustes), `SVG ${loja.ajustes.estilo} copiado`),
  "baixar-svg"() {
    baixar(svgDoEstado(loja.dot, loja.estado, loja.ajustes), `${nomeDoArquivo(loja.dot)}-${loja.estado}.svg`);
  },
  "baixar-gif": () =>
    comProgresso("Gerando GIF", (p) => gifDoEstado(loja.dot, loja.estado, loja.ajustes, p), `${nomeDoArquivo(loja.dot)}-${loja.estado}.gif`),
  "copiar-unico": () => copiar(svgUnico(loja.dot, loja.ajustes), "SVG com os 8 estados copiado"),
  "baixar-unico"() {
    baixar(svgUnico(loja.dot, loja.ajustes), `${nomeDoArquivo(loja.dot)}.svg`);
  },
  "copiar-folha": () => copiar(folha([loja.dot], loja.ajustes), "Folha com os 8 estados copiada"),
  "baixar-zip": () => comProgresso("Montando o zip", (p) => zipDoDot(loja.dot, loja.ajustes, p), `${nomeDoArquivo(loja.dot)}.zip`),
  "copiar-folha-time": () => copiar(folha(loja.time, loja.ajustes), "Folha do time copiada"),
  "baixar-zip-time": () => comProgresso("Montando o zip do time", (p) => zipDoTime(loja.time, loja.ajustes, p), "time-labdots.zip"),
};


document.addEventListener("click", (e) => {
  const alvo = (e.target as HTMLElement).closest<HTMLElement>("[data-acao],[data-png],[data-estilo],[data-fundo-gif]");
  if (!alvo || alvo.matches(":disabled")) return;
  const { acao, png, estilo, fundoGif } = alvo.dataset;
  if (png) loja.mudarAjuste("tamanhoPng", Number(png));
  if (estilo) loja.mudarAjuste("estilo", estilo as "animado");
  if (fundoGif) loja.mudarAjuste("fundoGif", fundoGif as "branco");
  if (acao && acoes[acao]) {
    fecharAberto();
    acoes[acao]();
  }
});

$("#compartilhar").addEventListener("click", async () => {
  const url = loja.endereco();
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try {
      await navigator.share({ title: "Meu dot no LabDots", url });
      return;
    } catch {}
  }
  copiar(url, "Link do dot copiado");
});

// ---------- reações às mudanças ----------

function atualizarControles() {
  document.body.style.setProperty("--cor-dot", loja.dot.cor);
  document.body.style.setProperty("--tinta-dot", luminancia(loja.dot.cor) > 0.5 ? "#1e1b18" : "#ffffff");
  document.body.style.setProperty("--cor-olho", tintaDosOlhos(loja.dot.cor, loja.dot.corOlho).T);
  botaoCor.setAttribute("aria-label", `Cor: ${nomeDaCor(loja.dot.cor)}`);
  botaoOlho.setAttribute("aria-label", `Cor dos olhos: ${loja.dot.corOlho ? nomeDaCor(loja.dot.corOlho) : "Automático"}`);
  leque.definir("corpo", loja.dot.cor);
  leque.definir("olhos", loja.dot.corOlho ?? "auto");
  ($("#centralizar") as HTMLButtonElement).disabled = !loja.dot.olhoX && !loja.dot.olhoY;
  vaoOlho.value = String(loja.dot.vaoOlho ?? 0);
  larguraOlho.value = String(loja.dot.larguraOlho ?? 1);
  marcar(itensAnel, (b) => b.dataset.expressao === loja.dot.expressao);
}

function desenharTudo(aosPoucos = false) {
  atualizarControles();
  desenharAnel(aosPoucos);
  posicionarCarrossel();
  desenharEstados();
  desenharPrevia();
}

// O dot do meio responde no clique; o resto redesenha no quadro seguinte, pra não segurar a animação.
// Várias mudanças seguidas viram um redesenho só.
let redesenhoMarcado = false;
function redesenharDepois() {
  if (redesenhoMarcado) return;
  redesenhoMarcado = true;
  requestAnimationFrame(() =>
    setTimeout(() => {
      redesenhoMarcado = false;
      desenharTudo(true);
    }),
  );
}

loja.ouvir((motivo) => {
  if (motivo === "estado") {
    svgVivo().dataset.estado = loja.estado;
    vivo.style.transformOrigin = "50% 88%";
    amassar(vivo, 0.5);
    desenharEstados();
    return;
  }
  if (motivo === "expressao") {
    trocarOlhos(loja.dot);
    marcar(itensAnel, (b) => b.dataset.expressao === loja.dot.expressao);
    // Abas e prévia do time só trocam os olhos, no quadro seguinte.
    requestAnimationFrame(() => {
      const o = olhosDoDot(loja.dot);
      abasEstado.forEach((b) => trocarOlhosEm($("[data-mini] svg", b), "aba", loja.dot, o));
      trocarOlhosEm($("#previa-salvar svg"), "dot", loja.dot, o);
    });
    return;
  }
  if (motivo === "cor") {
    pintarVivo(loja.dot.cor);
    atualizarControles();
    // Trocar de cor só repinta; refaz o anel apenas se os olhos mudarem de tinta (corpo muito escuro).
    if (tintaDe(loja.dot) !== tintaAnel) desenharAnel();
    else recolorirMiniaturas(loja.dot.cor);
    desenharEstados();
    desenharPrevia();
    return;
  }
  if (motivo === "olhos") {
    desenharVivo();
    atualizarControles();
    return redesenharDepois();
  }
  // No meio do sorteio só o dot do meio muda; o resto redesenha quando o dado para.
  if (motivo === "rolando") return desenharVivo();
  if (motivo === "formato") {
    trocarFormatoComEfeito();
    posicionarCarrossel();
    atualizarControles();
    return redesenharDepois();
  }
  if (motivo === "time") return desenharTime();
  if (motivo.startsWith("ajuste:")) {
    aplicarAjustes();
    if (/velocidade|bochechas|sombra/.test(motivo)) desenharVivo();
    if (/velocidade|bochechas|sombra/.test(motivo)) desenharEstados();
    if (motivo === "ajuste:velocidade") desenharAnel();
    return;
  }
  desenharTudo();
});

desenharVivo();
desenharCarrossel();
desenharTudo();
desenharTime();
aplicarAjustes();
entrarAnel();
