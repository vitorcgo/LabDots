import { get } from "node:https";

// https.get com a conexão fechada no fim: o fetch do Node deixa um socket vivo que derruba o processo na saída, no Windows.
function baixarTexto(url: string) {
  return new Promise<string | null>((ok) => {
    const req = get(url, { headers: { connection: "close", "user-agent": "labdots-build" }, timeout: 8000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return ok(null);
      }
      let corpo = "";
      res.setEncoding("utf8");
      res.on("data", (parte) => (corpo += parte));
      res.on("end", () => ok(corpo));
    });
    req.on("timeout", () => req.destroy());
    req.on("error", () => ok(null));
  });
}

export interface Contribuicoes {
  /** Semanas em colunas, cada uma com até 7 dias (domingo primeiro). Nível de 0 a 4, igual ao do GitHub. */
  semanas: { data: string; nivel: number }[][];
  total: number;
}

/**
 * Lê a página pública de contribuições do GitHub na hora do build. Não precisa de token.
 * Se o GitHub não responder, devolve null e o painel não aparece (melhor nada do que número inventado).
 */
export async function buscarContribuicoes(usuario: string, semanas = 26): Promise<Contribuicoes | null> {
  try {
    const html = await baixarTexto(`https://github.com/users/${usuario}/contributions`);
    if (!html) return null;
    const dias = [...html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"[^>]*?data-level="(\d)"/g)]
      .map(([, data, nivel]) => ({ data, nivel: Number(nivel) }))
      .sort((a, b) => a.data.localeCompare(b.data));
    const total = Number(html.match(/([\d.,]+)\s+contributions?\s+in the last year/)?.[1].replace(/[.,]/g, ""));
    if (!dias.length || !Number.isFinite(total)) return null;

    const colunas: Contribuicoes["semanas"] = [];
    for (const dia of dias) {
      const semana = new Date(`${dia.data}T12:00:00Z`).getUTCDay();
      if (semana === 0 || !colunas.length) colunas.push([]);
      colunas[colunas.length - 1].push(dia);
    }
    return { semanas: colunas.slice(-semanas), total };
  } catch {
    return null;
  }
}
