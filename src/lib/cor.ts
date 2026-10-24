const limitar = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

export function paraRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function paraHex([r, g, b]: [number, number, number]) {
  return "#" + [r, g, b].map((v) => limitar(v).toString(16).padStart(2, "0")).join("");
}

export function misturar(a: string, b: string, t: number) {
  const x = paraRgb(a);
  const y = paraRgb(b);
  return paraHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

export const clarear = (c: string, t: number) => misturar(c, "#ffffff", t);
export const escurecer = (c: string, t: number) => misturar(c, "#120e0b", t);

// Luminância relativa (WCAG), usada pra decidir se os olhos ficam escuros ou claros.
export function luminancia(hex: string) {
  const [r, g, b] = paraRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const ehHex = (v: string) => /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);

export function normalizarHex(v: string) {
  let h = v.replace("#", "").toLowerCase();
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  return "#" + h;
}
