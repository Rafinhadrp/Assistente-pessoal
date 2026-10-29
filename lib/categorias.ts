// Emoji e cor de cada categoria (só visual)

const EMOJIS: Record<string, string> = {
  mercado: "🛒",
  supermercado: "🛒",
  alimentacao: "🍽️",
  comida: "🍽️",
  restaurante: "🍽️",
  lanche: "🥪",
  padaria: "🥖",
  cafe: "☕",
  transporte: "🚗",
  combustivel: "⛽",
  gasolina: "⛽",
  uber: "🚕",
  carro: "🚗",
  saude: "💊",
  farmacia: "💊",
  lazer: "🎮",
  viagem: "✈️",
  contas: "💡",
  luz: "💡",
  agua: "🚿",
  internet: "📶",
  telefone: "📱",
  moradia: "🏠",
  aluguel: "🏠",
  casa: "🏠",
  educacao: "📚",
  roupas: "👕",
  presente: "🎁",
  pet: "🐾",
  assinatura: "🔁",
  salario: "💼",
  pagamento: "💼",
  extra: "✨",
  venda: "🏷️",
  pix: "⚡",
  investimento: "📈",
  outros: "•",
};

export function emojiCategoria(categoria: string): string {
  return EMOJIS[categoria] ?? "•";
}

export const AGENDA = {
  saude: { nome: "Saúde", emoji: "🩺", cor: "#e5534b" },
  trabalho: { nome: "Trabalho", emoji: "💼", cor: "#3b82f6" },
  pessoal: { nome: "Pessoal", emoji: "🙂", cor: "#a371f7" },
  outros: { nome: "Outros", emoji: "📌", cor: "#8b949e" },
} as const;

export type CategoriaAgenda = keyof typeof AGENDA;
