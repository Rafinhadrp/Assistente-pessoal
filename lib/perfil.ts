import type { SupabaseClient } from "@supabase/supabase-js";

export type Perfil = {
  email: string;
  nome: string | null; // como quer ser chamado
  nomeCompleto: string | null;
  nascimento: string | null; // YYYY-MM-DD
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  profissao: string | null;
  sobre: string | null;
  avatar: string | null;
};

// Lê o perfil do usuário logado (funciona mesmo se o banco ainda não tiver a tabela)
export async function carregarPerfil(supabase: SupabaseClient, email: string): Promise<Perfil> {
  let { data, error } = await supabase
    .from("profiles")
    .select("name, full_name, birth_date, phone, city, state, occupation, bio, avatar")
    .maybeSingle();
  if (error) ({ data } = await supabase.from("profiles").select("name, city, avatar").maybeSingle());
  const d = (data ?? {}) as Record<string, string | null>;
  return {
    email,
    nome: d.name ?? null,
    nomeCompleto: d.full_name ?? null,
    nascimento: d.birth_date ?? null,
    telefone: d.phone ?? null,
    cidade: d.city ?? null,
    estado: d.state ?? null,
    profissao: d.occupation ?? null,
    sobre: d.bio ?? null,
    avatar: d.avatar ?? null,
  };
}

// Primeira letra do nome (ou do e-mail)
export function inicial(perfil: Pick<Perfil, "nome" | "email"> & { nomeCompleto?: string | null }): string {
  return (perfil.nome?.trim() || perfil.nomeCompleto?.trim() || perfil.email || "?").charAt(0).toUpperCase();
}

// Nome para mostrar: apelido, nome completo ou o começo do e-mail
export function nomeExibido(perfil: Pick<Perfil, "nome" | "email"> & { nomeCompleto?: string | null }): string {
  return perfil.nome?.trim() || perfil.nomeCompleto?.trim().split(" ")[0] || perfil.email.split("@")[0];
}

// Idade a partir da data de nascimento
export function idade(nascimento: string | null): number | null {
  if (!nascimento) return null;
  const [a, m, d] = nascimento.split("-").map(Number);
  const hoje = new Date();
  let anos = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) anos--;
  return anos >= 0 && anos < 130 ? anos : null;
}
