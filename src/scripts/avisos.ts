const caixa = () => document.getElementById("avisos")!;

export interface Aviso {
  texto(t: string): void;
  progresso(p: number): void;
  fechar(atraso?: number): void;
}

export function avisar(texto: string, tipo: "ok" | "erro" | "carregando" = "ok"): Aviso {
  const el = document.createElement("div");
  el.setAttribute("role", tipo === "erro" ? "alert" : "status");
  el.className =
    "pointer-events-auto relative flex min-h-11 items-center gap-2.5 overflow-hidden rounded-full bg-tinta py-2.5 pr-5 pl-4 text-[15px] font-medium text-papel shadow-flutua transition duration-300 translate-y-3 opacity-0";
  const marca = document.createElement("span");
  marca.className = "size-2.5 shrink-0 rounded-full " + (tipo === "erro" ? "bg-[#ff7a5c]" : tipo === "carregando" ? "animate-pulse bg-papel" : "bg-[#9be37a]");
  const rotulo = document.createElement("span");
  rotulo.textContent = texto;
  const barra = document.createElement("span");
  barra.className = "absolute bottom-0 left-0 h-[3px] bg-papel/60 transition-[width]";
  barra.style.width = "0";
  el.append(marca, rotulo, barra);
  caixa().append(el);
  requestAnimationFrame(() => el.classList.remove("translate-y-3", "opacity-0"));

  const aviso: Aviso = {
    texto: (t) => (rotulo.textContent = t),
    progresso: (p) => (barra.style.width = `${Math.round(p * 100)}%`),
    fechar(atraso = 0) {
      setTimeout(() => {
        el.classList.add("opacity-0", "translate-y-3");
        setTimeout(() => el.remove(), 320);
      }, atraso);
    },
  };
  if (tipo !== "carregando") aviso.fechar(tipo === "erro" ? 4200 : 2200);
  return aviso;
}
