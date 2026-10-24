// Fundo de laboratório: anéis concêntricos bem leves em volta do dot, como as marcas de uma placa de ensaio.
// Fica parado; só redesenha quando a janela muda de tamanho, a página rola ou o tema troca.
export function iniciarFundo(canvas: HTMLCanvasElement, centro: HTMLElement) {
  const ctx = canvas.getContext("2d")!;
  const passo = 46;
  let largura = 0;
  let altura = 0;
  let pedido = 0;
  // Cor e centro ficam guardados: ler layout e estilo a cada quadro de rolagem travava o celular.
  let cor = "";
  let centroX = 0;
  let centroYNaPagina = 0;

  function lerPagina() {
    cor = getComputedStyle(document.documentElement).getPropertyValue("--pontinho").trim() || "#cbc2b4";
    const r = centro.getBoundingClientRect();
    centroX = r.left + r.width / 2;
    centroYNaPagina = r.top + r.height / 2 + scrollY;
  }

  function medir() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    largura = innerWidth;
    altura = innerHeight;
    canvas.width = largura * dpr;
    canvas.height = altura * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lerPagina();
    pedir();
  }

  function desenhar() {
    pedido = 0;
    const cx = centroX;
    const cy = centroYNaPagina - scrollY;
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
    ctx.globalAlpha = 1;
  }

  const pedir = () => (pedido ||= requestAnimationFrame(desenhar));

  addEventListener("resize", medir);
  addEventListener("scroll", pedir, { passive: true });
  medir();
  return {
    redesenhar() {
      lerPagina();
      pedir();
    },
  };
}
