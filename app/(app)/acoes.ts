"use server";

import { revalidatePath } from "next/cache";
import { dataValida, horaLocalParaISO } from "@/lib/datas";
import { reaisParaCentavos } from "@/lib/dinheiro";
import { criarClienteServidor } from "@/lib/supabase/server";

// Ações feitas à mão pelo usuário nas telas (editar, lixeira).
// Tudo passa pelo login dele, então o RLS garante que só mexe nos próprios dados.

export type Resultado = { ok: true } | { ok: false; erro: string };
type Tabela = "transactions" | "appointments";

const TABELAS: Tabela[] = ["transactions", "appointments"];
const CATEGORIAS_AGENDA = ["saude", "pessoal", "trabalho", "outros"];
const STATUS_AGENDA = ["pending", "done", "archived"];
const ID = /^[0-9a-f-]{36}$/i;

function atualizarTelas() {
  revalidatePath("/financas");
  revalidatePath("/agenda");
  revalidatePath("/lixeira");
}

function falha(e: unknown): Resultado {
  console.error(e);
  return { ok: false, erro: "Não consegui salvar. Verifique a internet e tente de novo." };
}

const categoriaLivre = (v: string) =>
  v
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") || "outros";

export async function editarLancamento(
  id: string,
  dados: { tipo: string; valor: string; descricao: string; categoria: string; data: string },
): Promise<Resultado> {
  if (!ID.test(id)) return { ok: false, erro: "Lançamento inválido." };
  if (dados.tipo !== "income" && dados.tipo !== "expense") return { ok: false, erro: "Escolha receita ou gasto." };
  const centavos = reaisParaCentavos(dados.valor);
  if (centavos === null) return { ok: false, erro: "Valor inválido." };
  if (!dataValida(dados.data)) return { ok: false, erro: "Data inválida." };

  try {
    const supabase = await criarClienteServidor();
    const { error } = await supabase
      .from("transactions")
      .update({
        type: dados.tipo,
        amount_cents: centavos,
        description: dados.descricao.trim(),
        category: categoriaLivre(dados.categoria),
        date: dados.data,
        edited_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
  } catch (e) {
    return falha(e);
  }
  atualizarTelas();
  return { ok: true };
}

export async function editarCompromisso(
  id: string,
  dados: { titulo: string; dataHora: string; categoria: string; status: string; notas: string },
): Promise<Resultado> {
  if (!ID.test(id)) return { ok: false, erro: "Compromisso inválido." };
  if (!dados.titulo.trim()) return { ok: false, erro: "Dê um título ao compromisso." };
  const inicio = horaLocalParaISO(dados.dataHora);
  if (!inicio) return { ok: false, erro: "Data ou horário inválido." };
  if (!CATEGORIAS_AGENDA.includes(dados.categoria)) return { ok: false, erro: "Categoria inválida." };
  if (!STATUS_AGENDA.includes(dados.status)) return { ok: false, erro: "Situação inválida." };

  try {
    const supabase = await criarClienteServidor();
    const { error } = await supabase
      .from("appointments")
      .update({
        title: dados.titulo.trim(),
        starts_at: inicio,
        category: dados.categoria,
        status: dados.status,
        notes: dados.notas.trim() || null,
        edited_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
  } catch (e) {
    return falha(e);
  }
  atualizarTelas();
  return { ok: true };
}

// Lixeira: o item some das telas e da IA, e fica guardado por 30 dias
export async function moverParaLixeira(tabela: Tabela, id: string): Promise<Resultado> {
  return marcarLixeira(tabela, id, new Date().toISOString());
}

export async function restaurar(tabela: Tabela, id: string): Promise<Resultado> {
  return marcarLixeira(tabela, id, null);
}

async function marcarLixeira(tabela: Tabela, id: string, quando: string | null): Promise<Resultado> {
  if (!TABELAS.includes(tabela) || !ID.test(id)) return { ok: false, erro: "Item inválido." };
  try {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.from(tabela).update({ deleted_at: quando }).eq("id", id);
    if (error) throw error;
  } catch (e) {
    return falha(e);
  }
  atualizarTelas();
  return { ok: true };
}

// Apagar de vez: só funciona para o que já está na lixeira
export async function apagarDeVez(tabela: Tabela, id: string): Promise<Resultado> {
  if (!TABELAS.includes(tabela) || !ID.test(id)) return { ok: false, erro: "Item inválido." };
  try {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.from(tabela).delete().eq("id", id).not("deleted_at", "is", null);
    if (error) throw error;
  } catch (e) {
    return falha(e);
  }
  atualizarTelas();
  return { ok: true };
}

export async function esvaziarLixeira(): Promise<Resultado> {
  try {
    const supabase = await criarClienteServidor();
    for (const tabela of TABELAS) {
      const { error } = await supabase.from(tabela).delete().not("deleted_at", "is", null);
      if (error) throw error;
    }
  } catch (e) {
    return falha(e);
  }
  atualizarTelas();
  return { ok: true };
}
