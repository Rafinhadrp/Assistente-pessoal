"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Resultado } from "../acoes";

const limpar = (v: string | null | undefined, max = 80) => (v ?? "").trim().slice(0, max) || null;

// Salva o perfil completo (e a foto)
export async function salvarPerfil(dados: {
  nome: string;
  nomeCompleto: string;
  nascimento: string;
  telefone: string;
  cidade: string;
  estado: string;
  profissao: string;
  sobre: string;
  avatar: string | null;
}): Promise<Resultado> {
  if (dados.avatar && (!dados.avatar.startsWith("data:image/") || dados.avatar.length > 390_000)) {
    return { ok: false, erro: "Foto inválida ou grande demais." };
  }
  if (dados.nascimento && !/^\d{4}-\d{2}-\d{2}$/.test(dados.nascimento)) {
    return { ok: false, erro: "Data de nascimento inválida." };
  }
  try {
    const supabase = await criarClienteServidor();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, erro: "Faça login de novo." };
    const { error } = await supabase.from("profiles").upsert({
      id: auth.user.id,
      name: limpar(dados.nome, 60),
      full_name: limpar(dados.nomeCompleto, 120),
      birth_date: dados.nascimento || null,
      phone: limpar(dados.telefone, 30),
      city: limpar(dados.cidade, 60),
      state: limpar(dados.estado, 30),
      occupation: limpar(dados.profissao, 80),
      bio: limpar(dados.sobre, 500),
      avatar: dados.avatar,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error(error);
      const faltaBanco = ["42P01", "PGRST205", "42703", "PGRST204"].includes(error.code);
      return {
        ok: false,
        erro: faltaBanco
          ? "Falta atualizar o banco de dados (rode o supabase/atualizacao.sql)."
          : "Não consegui salvar. Tente de novo.",
      };
    }
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não consegui salvar. Verifique a internet." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function trocarSenha(nova: string): Promise<Resultado> {
  if (nova.length < 6) return { ok: false, erro: "A senha precisa ter pelo menos 6 caracteres." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) {
    console.error(error);
    return {
      ok: false,
      erro:
        error.code === "same_password"
          ? "A nova senha é igual à atual."
          : error.code === "weak_password"
            ? "Senha fraca. Use letras e números."
            : "Não consegui trocar a senha. Tente de novo.",
    };
  }
  return { ok: true };
}

export async function sairDaConta() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
