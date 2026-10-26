// Valores são guardados em centavos (inteiro). Só formatamos como R$ na tela.

const formatador = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarReais(centavos: number): string {
  return formatador.format(centavos / 100);
}

// Converte o valor que a IA mandou (em reais, ex: 35.9 ou "35,90") para centavos.
// Devolve null se não for um valor válido e positivo.
export function reaisParaCentavos(valor: unknown): number | null {
  let numero: number;
  if (typeof valor === "number") {
    numero = valor;
  } else if (typeof valor === "string") {
    const limpo = valor.replace(/[R$\s]/g, "");
    // "1.234,56" -> "1234.56"; "35,9" -> "35.9"
    const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
    numero = Number(normalizado);
  } else {
    return null;
  }
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return Math.round(numero * 100);
}
