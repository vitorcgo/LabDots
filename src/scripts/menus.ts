interface Aberto {
  fechar(devolverFoco?: boolean): void;
  dentro(alvo: Node): boolean;
}

let aberto: Aberto | null = null;

export function fecharAberto(devolverFoco = false) {
  aberto?.fechar(devolverFoco);
}

addEventListener("pointerdown", (e) => {
  if (aberto && !aberto.dentro(e.target as Node)) aberto.fechar();
});
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && aberto) {
    e.preventDefault();
    aberto.fechar(true);
  }
});

const itens = (painel: HTMLElement) =>
  [...painel.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled]),[role="radio"],[role="switch"]')].filter(
    (el) => el.offsetParent !== null,
  );

/** Setas, Home e End movem o foco entre os itens do painel. */
export function navegarComSetas(painel: HTMLElement, vertical = true) {
  painel.addEventListener("keydown", (e) => {
    const lista = itens(painel);
    const i = lista.indexOf(document.activeElement as HTMLElement);
    const proximo = vertical ? "ArrowDown" : "ArrowRight";
    const anterior = vertical ? "ArrowUp" : "ArrowLeft";
    let alvo = -1;
    if (e.key === proximo) alvo = (i + 1) % lista.length;
    else if (e.key === anterior) alvo = (i - 1 + lista.length) % lista.length;
    else if (e.key === "Home") alvo = 0;
    else if (e.key === "End") alvo = lista.length - 1;
    if (alvo < 0) return;
    e.preventDefault();
    lista[alvo].focus();
  });
}

interface OpcoesPopover {
  aoAbrir?: () => void;
  aoFechar?: () => void;
  /** Elementos que contam como "dentro" além do botão e do painel. */
  extras?: HTMLElement[];
  focarAoAbrir?: boolean;
}

export function popover(botao: HTMLElement, painel: HTMLElement, o: OpcoesPopover = {}) {
  const controle: Aberto & { abrir(): void; alternar(): void } = {
    abrir() {
      if (aberto && aberto !== controle) aberto.fechar();
      painel.hidden = false;
      botao.setAttribute("aria-expanded", "true");
      aberto = controle;
      o.aoAbrir?.();
      if (o.focarAoAbrir !== false) requestAnimationFrame(() => itens(painel)[0]?.focus());
    },
    fechar(devolverFoco = false) {
      if (painel.hidden) return;
      painel.hidden = true;
      botao.setAttribute("aria-expanded", "false");
      if (aberto === controle) aberto = null;
      o.aoFechar?.();
      if (devolverFoco) botao.focus();
    },
    alternar() {
      painel.hidden ? controle.abrir() : controle.fechar();
    },
    dentro: (alvo) => botao.contains(alvo) || painel.contains(alvo) || !!o.extras?.some((x) => x.contains(alvo)),
  };
  botao.addEventListener("click", () => controle.alternar());
  botao.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" && botao.getAttribute("aria-haspopup") === "menu") {
      e.preventDefault();
      controle.abrir();
    }
  });
  painel.addEventListener("focusout", (e) => {
    const para = e.relatedTarget as Node | null;
    if (para && !controle.dentro(para)) controle.fechar();
  });
  navegarComSetas(painel);
  return controle;
}

/** Marca o item escolhido num grupo de rádios (aria-checked). */
export function marcar(grupo: Iterable<Element>, ativo: (el: HTMLElement) => boolean) {
  for (const el of grupo) {
    const sim = String(ativo(el as HTMLElement));
    const item = el as HTMLElement;
    // Num grupo de rádios só o escolhido entra no Tab; as setas andam entre os outros.
    const tab = item.closest('[role="radiogroup"]') ? (sim === "true" ? 0 : -1) : item.tabIndex;
    // Só mexe no que mudou: cada atributo alterado faz o navegador revisar o estilo daquele botão.
    if (el.getAttribute("aria-checked") === sim && item.tabIndex === tab) continue;
    el.setAttribute("aria-checked", sim);
    item.tabIndex = tab;
  }
}
