export interface Amostra {
  nome: string;
  hex: string;
}

// Anel de fora da flor: cores vivas. Anel de dentro: tons de terra e neutros.
export const PETALAS_FORA: Amostra[] = [
  { nome: "Tomate", hex: "#e8553a" },
  { nome: "Tangerina", hex: "#f08a24" },
  { nome: "Mostarda", hex: "#e8b931" },
  { nome: "Pistache", hex: "#a5c64a" },
  { nome: "Musgo", hex: "#4e8b57" },
  { nome: "Menta", hex: "#3fb8a0" },
  { nome: "Céu", hex: "#4c9be8" },
  { nome: "Anil", hex: "#3f51c9" },
  { nome: "Ameixa", hex: "#7b4bb7" },
  { nome: "Chiclete", hex: "#e5679b" },
];

export const PETALAS_DENTRO: Amostra[] = [
  { nome: "Cacau", hex: "#7a4a33" },
  { nome: "Areia", hex: "#d9c09a" },
  { nome: "Névoa", hex: "#b9c4cc" },
  { nome: "Grafite", hex: "#45454d" },
  { nome: "Carvão", hex: "#1c1b20" },
  { nome: "Leite", hex: "#f5efe6" },
  { nome: "Branco", hex: "#ffffff" },
];

export const AMOSTRAS = [...PETALAS_FORA, ...PETALAS_DENTRO];

export const nomeDaCor = (hex: string) =>
  AMOSTRAS.find((a) => a.hex === hex.toLowerCase())?.nome ?? hex.toUpperCase();
