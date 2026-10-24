import { nomeDaCor } from "../lib/paleta";
import { fecharAberto } from "./menus";

export type Alvo = "corpo" | "olhos";

interface OpcoesLeque {
  /** `null` volta pra cor atual; "auto" é a lâmina Automático (só nos olhos). */
  aoProvar(cor: string | null, alvo: Alvo): void;
  aoEscolher(cor: string, alvo: Alvo): void;
}

/**
 * Leque de cores: as lâminas ficam presas num pino sobre o botão e abrem em arco, uma depois da outra.
 * O mesmo leque serve a cor do corpo e a dos olhos; quem abriu decide o alvo.
 */
export function iniciarLeque(leque: HTMLElement, o: OpcoesLeque) {
  const todas = [...leque.querySelectorAll<HTMLElement>(".lamina")];
  const auto = leque.querySelector<HTMLButtonElement>('[data-cor="auto"]')!;
  const livre = leque.querySelector<HTMLInputElement>("#cor-livre")!;
  const nome = leque.querySelector<HTMLElement>("#nome-cor")!;
  const botoes = new Map<HTMLButtonElement, Alvo>();
  const marcadas: Record<Alvo, string> = { corpo: "", olhos: "auto" };
  let botao: HTMLButtonElement | null = null;
  let alvo: Alvo = "corpo";
  let fechando = 0;

  const visiveis = () => todas.filter((l) => !l.hidden);
  const amostras = () => visiveis().filter((l): l is HTMLButtonElement => l instanceof HTMLButtonElement);
  const nomeDe = (cor: string) => (cor === "auto" ? "Automático" : nomeDaCor(cor));

  function posicionar() {
    if (!botao) return;
    const r = botao.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    leque.style.left = `${x}px`;
    leque.style.top = `${y}px`;
    // O leque abre apontando pro centro da tela, então nunca bate numa borda, esteja o botão onde estiver.
    // Ângulo 0 é pra cima e cresce no sentido horário, igual ao rotate() do CSS.
    const ideal = (Math.atan2(innerWidth / 2 - x, y - innerHeight / 2) * 180) / Math.PI;
    const folga = Math.min(x, innerWidth - x, y, innerHeight - y);
    const abertura = folga > 230 ? 150 : 110;
    // Entre as direções em que todas as pontas cabem na tela, fica a mais perto do centro.
    const comprimento = 196;
    const cabe = (c: number) => {
      for (let ang = c - abertura / 2; ang <= c + abertura / 2; ang += 10) {
        const rad = (ang * Math.PI) / 180;
        const px = x + Math.sin(rad) * comprimento;
        const py = y - Math.cos(rad) * comprimento;
        if (px < 8 || px > innerWidth - 8 || py < 8 || py > innerHeight - 8) return false;
      }
      return true;
    };
    let centro = ideal;
    for (let desvio = 0; desvio <= 180; desvio += 5) {
      const achou = [ideal + desvio, ideal - desvio].find(cabe);
      if (achou !== undefined) {
        centro = achou;
        break;
      }
    }
    const lista = visiveis();
    const passo = abertura / (lista.length - 1);
    lista.forEach((l, i) => {
      l.style.setProperty("--ang", `${centro - abertura / 2 + passo * i}deg`);
      l.style.setProperty("--atraso", `${i * 16}ms`);
    });
    // O nome da cor fica logo acima da ponta do meio do leque.
    const meio = (centro * Math.PI) / 180;
    nome.style.left = `${Math.sin(meio) * 214}px`;
    nome.style.top = `${-Math.cos(meio) * 214 - 18}px`;
  }

  function marcar(cor: string) {
    amostras().forEach((p) => p.setAttribute("aria-checked", String(p.dataset.cor === cor)));
    if (cor !== "auto") livre.value = cor;
    nome.textContent = nomeDe(cor);
  }

  function abrir(quem: HTMLButtonElement) {
    clearTimeout(fechando);
    if (leque.dataset.aberto !== undefined) {
      if (quem === botao) return fechar();
      delete leque.dataset.aberto;
      botao?.setAttribute("aria-expanded", "false");
    }
    fecharAberto();
    botao = quem;
    alvo = botoes.get(quem)!;
    auto.hidden = alvo !== "olhos";
    leque.setAttribute("aria-label", alvo === "olhos" ? "Cor dos olhos" : "Cor do dot");
    marcar(marcadas[alvo]);
    leque.hidden = false;
    posicionar();
    void leque.offsetWidth;
    leque.dataset.aberto = "";
    quem.setAttribute("aria-expanded", "true");
    const marcada = amostras().find((p) => p.getAttribute("aria-checked") === "true") ?? amostras()[0];
    setTimeout(() => marcada.focus({ preventScroll: true }), 140);
  }

  function fechar(devolverFoco = false) {
    if (leque.dataset.aberto === undefined) return;
    delete leque.dataset.aberto;
    botao?.setAttribute("aria-expanded", "false");
    o.aoProvar(null, alvo);
    fechando = window.setTimeout(() => (leque.hidden = true), 300);
    if (devolverFoco) botao?.focus({ preventScroll: true });
  }

  function escolher(cor: string) {
    marcadas[alvo] = cor;
    o.aoEscolher(cor, alvo);
    fechar(true);
  }

  todas.forEach((l) => {
    if (!(l instanceof HTMLButtonElement)) return;
    const provar = () => {
      o.aoProvar(l.dataset.cor!, alvo);
      nome.textContent = nomeDe(l.dataset.cor!);
    };
    l.addEventListener("pointerenter", provar);
    l.addEventListener("focus", provar);
    l.addEventListener("click", () => escolher(l.dataset.cor!));
  });
  leque.addEventListener("pointerleave", () => o.aoProvar(null, alvo));
  livre.addEventListener("input", () => {
    o.aoProvar(livre.value, alvo);
    nome.textContent = livre.value.toUpperCase();
  });
  livre.addEventListener("change", () => escolher(livre.value));
  leque.addEventListener("keydown", (e) => {
    const lista: HTMLElement[] = [...amostras(), livre];
    const i = lista.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.stopPropagation();
      fechar(true);
    } else if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      const passo = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      lista[(i + passo + lista.length) % lista.length].focus({ preventScroll: true });
    }
  });
  addEventListener("pointerdown", (e) => {
    const no = e.target as Node;
    if (!leque.contains(no) && ![...botoes.keys()].some((b) => b.contains(no))) fechar();
  });
  addEventListener("resize", () => leque.dataset.aberto !== undefined && posicionar());

  return {
    ligar(b: HTMLButtonElement, a: Alvo) {
      botoes.set(b, a);
      b.addEventListener("click", () => abrir(b));
    },
    /** Guarda a cor atual de cada alvo, pra lâmina certa vir marcada ao abrir. */
    definir(a: Alvo, cor: string) {
      marcadas[a] = cor;
      if (alvo === a && leque.dataset.aberto !== undefined) marcar(cor);
    },
    fechar,
  };
}
