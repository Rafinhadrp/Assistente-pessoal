// Carinhas do mascote <R/>. A IA escolhe uma para cada resposta.
export const HUMORES = [
  "feliz",
  "rindo",
  "acenando",
  "apaixonado",
  "dancando",
  "estiloso",
  "convencido",
  "pensando",
  "desconfiado",
  "espiando",
  "tramando",
  "fininho",
  "assustado",
  "tonto",
  "chorando",
  "emburrado",
  "bocejando",
  "dormindo",
  "violao",
  "programando",
  "erro",
  "parado",
] as const;

// Carinhas que o app usa sozinho (estados da tela)
export type Humor = (typeof HUMORES)[number] | "digitando" | "carregando" | "chamando" | "andando";

export const HUMOR_PADRAO: Humor = "feliz";

const ETIQUETA = /\[humor:\s*([a-z]+)\s*\]/gi;

// "[humor:feliz] Oi!" -> { humor: "feliz", texto: "Oi!" }
// Usa a primeira etiqueta e tira qualquer outra que a IA tenha deixado no meio.
export function separarHumor(conteudo: string): { humor: Humor; texto: string } {
  const achado = [...conteudo.matchAll(ETIQUETA)][0];
  const texto = conteudo.replace(ETIQUETA, "").replace(/^\s+/, "").replace(/ {2,}/g, " ");
  const nome = achado?.[1].toLowerCase();
  const humor = nome && (HUMORES as readonly string[]).includes(nome) ? (nome as Humor) : HUMOR_PADRAO;
  return { humor, texto };
}
