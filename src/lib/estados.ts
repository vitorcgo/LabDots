export type EstadoId = "ocioso" | "ouvindo" | "pensando" | "escrevendo" | "sucesso" | "alerta" | "erro" | "dormindo";

export interface Estado {
  id: EstadoId;
  nome: string;
  /** Duração do ciclo em segundos. Toda animação do estado fecha dentro dele, então o GIF emenda sem pulo. */
  ciclo: number;
  dica: string;
}

export const ESTADOS: Estado[] = [
  { id: "ocioso", nome: "Ocioso", ciclo: 6, dica: "Respira, pisca e olha em volta" },
  { id: "ouvindo", nome: "Ouvindo", ciclo: 2.4, dica: "Inclina a cabeça na direção do som" },
  { id: "pensando", nome: "Pensando", ciclo: 4, dica: "Olha pro alto com bolhas subindo" },
  { id: "escrevendo", nome: "Escrevendo", ciclo: 1.6, dica: "Olha pra baixo com balão digitando" },
  { id: "sucesso", nome: "Sucesso", ciclo: 2, dica: "Pula com confete" },
  { id: "alerta", nome: "Alerta", ciclo: 1.6, dica: "Treme e arregala os olhos" },
  { id: "erro", nome: "Erro", ciclo: 2, dica: "Chacoalha, sua e fica de rabisco" },
  { id: "dormindo", nome: "Dormindo", ciclo: 5, dica: "Olhos fechados e zzz" },
];

export const estadoPorId = (id: string) => ESTADOS.find((e) => e.id === id) ?? ESTADOS[0];
