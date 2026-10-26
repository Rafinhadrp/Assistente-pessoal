"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoLogin = { erro?: string; aviso?: string };

function lerCampos(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    senha: String(formData.get("senha") ?? ""),
  };
}

export async function entrar(_: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const { email, senha } = lerCampos(formData);
  if (!email || !senha) return { erro: "Preencha e-mail e senha." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { erro: "Confirme seu e-mail primeiro (veja sua caixa de entrada)." };
    }
    return { erro: "E-mail ou senha incorretos." };
  }
  redirect("/");
}

export async function criarConta(_: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const { email, senha } = lerCampos(formData);
  if (!email || !senha) return { erro: "Preencha e-mail e senha." };
  if (senha.length < 6) return { erro: "A senha precisa ter pelo menos 6 caracteres." };

  const h = await headers();
  const origem = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { emailRedirectTo: `${origem}/auth/callback` },
  });
  if (error) return { erro: `Não foi possível criar a conta: ${error.message}` };

  // Se a confirmação de e-mail estiver desligada no Supabase, já entra direto
  if (data.session) redirect("/");
  return { aviso: "Conta criada! Abra o e-mail que enviamos e clique no link para confirmar." };
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
