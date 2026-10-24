// Fundo de laboratório: anéis concêntricos bem leves em volta do dot, como as marcas de uma placa de ensaio.
// Um clique em qualquer lugar solta uma onda que corre pelos anéis. Só anima enquanto há onda.
export function iniciarFundo(canvas: HTMLCanvasElement, centro: HTMLElement) {
  const ctx = canvas.getContext("2d")!;
  const passo = 46;
  let largura = 0;
  let altura = 0;
  let pedido = 0;
  const ondas: { x: number; y: number; t0: number }[] = [];

  function medir() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    largura = innerWidth;
    altura = innerHeight;
    canvas.width = largura * dpr;
    canvas.height = altura * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pedir();
  }

  function desenhar(agora: number) {
    pedido = 0;
    const estilo = getComputedStyle(document.documentElement);
    const cor = estilo.getPropertyValue("--pontinho").trim() || "#cbc2b4";
    const r = centro.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const ate = Math.hypot(Math.max(cx, largura - cx), Math.max(cy, altura - cy));
    ctx.clearRect(0, 0, largura, altura);
    ctx.strokeStyle = cor;
    for (let raio = passo * 2; raio < ate; raio += passo) {
      // Os anéis somem aos poucos longe do centro pra não virar textura de papel quadriculado.
      ctx.globalAlpha = Math.max(0.12, 1 - raio / (ate * 1.1));
      ctx.lineWidth = raio % (passo * 4) === 0 ? 1.4 : 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, raio, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = ondas.length - 1; i >= 0; i--) {
      const o = ondas[i];
      const p = (agora - o.t0) / 900;
      if (p >= 1) {
        ondas.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = (1 - p) * 0.9;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(o.x, o.y, 12 + p * 220, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (ondas.length) pedir();
  }

  const pedir = () => (pedido ||= requestAnimationFrame(desenhar));

  addEventListener("pointerdown", (e) => {
    ondas.push({ x: e.clientX, y: e.clientY, t0: performance.now() });
    pedir();
  });
  addEventListener("resize", medir);
  addEventListener("scroll", pedir, { passive: true });
  medir();
  return { redesenhar: pedir };
}
