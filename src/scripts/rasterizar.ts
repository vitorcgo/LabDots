import { GIFEncoder, applyPalette, quantize } from "gifenc";

async function carregar(svg: string) {
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  return img;
}

export async function desenhar(svg: string, tamanho: number, fundo?: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = tamanho;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  if (fundo) {
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, tamanho, tamanho);
  }
  ctx.drawImage(await carregar(svg), 0, 0, tamanho, tamanho);
  return { canvas, ctx };
}

export async function pngDe(svg: string, tamanho: number) {
  const { canvas } = await desenhar(svg, tamanho);
  return new Promise<Blob>((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error("PNG vazio"))), "image/png"));
}

/**
 * Monta o GIF a partir de quadros congelados. `quadro(t)` devolve o SVG pausado no instante t;
 * como todo estado fecha o ciclo em `duracao`, o último quadro emenda no primeiro.
 */
export async function gifDe(
  quadro: (t: number) => string,
  duracao: number,
  o: { tamanho: number; transparente: boolean; fps?: number; aoAvancar?: (p: number) => void },
) {
  const fps = o.fps ?? 25;
  const total = Math.max(2, Math.round(duracao * fps));
  const atraso = Math.round(1000 / fps);
  const gif = GIFEncoder();
  for (let i = 0; i < total; i++) {
    const { ctx } = await desenhar(quadro((i / total) * duracao), o.tamanho, o.transparente ? undefined : "#ffffff");
    const { data } = ctx.getImageData(0, 0, o.tamanho, o.tamanho);
    if (o.transparente) {
      const paleta = quantize(data, 256, { format: "rgba4444", oneBitAlpha: true });
      const indice = applyPalette(data, paleta, "rgba4444");
      const vazio = paleta.findIndex((c) => c[3] === 0);
      gif.writeFrame(indice, o.tamanho, o.tamanho, {
        palette: paleta,
        delay: atraso,
        transparent: vazio >= 0,
        transparentIndex: Math.max(0, vazio),
        dispose: 2,
      });
    } else {
      const paleta = quantize(data, 256);
      gif.writeFrame(applyPalette(data, paleta), o.tamanho, o.tamanho, { palette: paleta, delay: atraso });
    }
    o.aoAvancar?.((i + 1) / total);
    // Devolve a vez pro navegador pintar a barra de progresso.
    if (i % 6 === 5) await new Promise((r) => setTimeout(r));
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: "image/gif" });
}
