// O app é de uma pessoa só. EMAILS_PERMITIDOS (separados por vírgula) limita
// quem pode criar conta e usar o chat. Vazio = qualquer um (só para testes locais).
export function emailPermitido(email: string | null | undefined): boolean {
  const lista = (process.env.EMAILS_PERMITIDOS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (lista.length === 0) return true;
  return !!email && lista.includes(email.trim().toLowerCase());
}
