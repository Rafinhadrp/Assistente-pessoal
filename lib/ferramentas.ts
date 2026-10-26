import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatarReais, reaisParaCentavos } from "./dinheiro";
import {
  dataValida,
  fimDoDiaISO,
  formatarData,
  formatarDataHora,
  hojeSP,
  horaLocalParaISO,
  inicioDoDiaISO,
  limitesDoMes,
  somarDias,
} from "./datas";

// ---------------------------------------------------------------------
// Definição das ferramentas que a IA pode chamar.
// A IA só interpreta e chama; quem grava, busca e soma é o código abaixo.
// ---------------------------------------------------------------------

const CATEGORIAS_COMPROMISSO = ["saude", "pessoal", "trabalho", "outros"] as const;
const STATUS_COMPROMISSO = ["pending", "done", "archived"] as const;
const PERIODOS_FINANCAS = ["hoje", "ontem", "semana", "mes", "mes_passado", "ano", "tudo"] as const;
const PERIODOS_AGENDA = ["hoje", "amanha", "semana", "mes", "proximos", "passados", "tudo"] as const;

const lancamento = (tipo: "receita" | "gasto"): Anthropic.Beta.BetaTool["input_schema"] => ({
  type: "object",
  properties: {
    valor: {
      type: "number",
      description: `Valor da ${tipo} em reais, como número (ex: 35.9 para R$ 35,90).`,
    },
    descricao: {
      type: "string",
      description: `Descrição curta da ${tipo} (ex: "${tipo === "gasto" ? "mercado" : "pagamento do dia 20"}").`,
    },
    data: {
      type: "string",
      description: "Data no formato YYYY-MM-DD. Omita para usar hoje.",
    },
    categoria: {
      type: "string",
      description:
        tipo === "gasto"
          ? "Categoria em minúsculas, sem acento (ex: mercado, transporte, saude, lazer, contas, moradia, outros)."
          : "Categoria em minúsculas, sem acento (ex: salario, extra, venda, outros).",
    },
    confirmar_duplicado: {
      type: "boolean",
      description:
        "Só use true se a ferramenta avisou que parecia duplicado E o usuário confirmou que é um lançamento novo.",
    },
  },
  required: ["valor", "descricao"],
});

export const ferramentas: Anthropic.Beta.BetaTool[] = [
  {
    name: "registrar_receita",
    description:
      "Registra uma entrada de dinheiro (salário, pagamento recebido, venda, pix recebido). Use quando o usuário disser que recebeu dinheiro.",
    input_schema: lancamento("receita"),
  },
  {
    name: "registrar_gasto",
    description:
      "Registra uma saída de dinheiro (compra, conta paga, despesa). Use quando o usuário disser que gastou ou pagou algo.",
    input_schema: lancamento("gasto"),
  },
  {
    name: "consultar_financas",
    description:
      "Consulta as finanças. Devolve o saldo atual (todas as receitas menos todos os gastos), os totais do período pedido e a lista de lançamentos. Os valores já vêm calculados e formatados: use-os exatamente como vierem, nunca faça contas.",
    input_schema: {
      type: "object",
      properties: {
        periodo: {
          type: "string",
          enum: [...PERIODOS_FINANCAS],
          description:
            "Período dos totais e da lista. 'semana' = últimos 7 dias. Padrão: 'mes' (mês atual). Ignorado se data_inicio/data_fim forem enviados.",
        },
        data_inicio: { type: "string", description: "Início do período (YYYY-MM-DD), opcional." },
        data_fim: { type: "string", description: "Fim do período (YYYY-MM-DD), opcional." },
        categoria: { type: "string", description: "Filtrar por uma categoria, opcional." },
        tipo: {
          type: "string",
          enum: ["income", "expense"],
          description: "Filtrar a lista só por receitas (income) ou só gastos (expense), opcional.",
        },
      },
    },
  },
  {
    name: "criar_compromisso",
    description:
      "Cria um compromisso na agenda (consulta, reunião, evento). Se o usuário não disser o horário, pergunte antes de criar. Se já existir um compromisso igual no mesmo horário, a ferramenta não cria outro e devolve o que já existe.",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Título curto (ex: 'Médico cardiologista')." },
        data_hora: {
          type: "string",
          description: "Data e hora no horário de Brasília, formato YYYY-MM-DDTHH:MM (ex: 2026-11-05T14:00).",
        },
        categoria: {
          type: "string",
          enum: [...CATEGORIAS_COMPROMISSO],
          description: "saude (médico, dentista, exame, terapia), trabalho, pessoal ou outros.",
        },
        notas: { type: "string", description: "Observações extras, opcional." },
      },
      required: ["titulo", "data_hora", "categoria"],
    },
  },
  {
    name: "listar_compromissos",
    description:
      "Lista compromissos da agenda, inclusive os antigos (histórico). Use para responder 'quando é meu médico?', 'o que tenho amanhã?', 'quando foi minha última consulta?'. Devolve o id de cada um.",
    input_schema: {
      type: "object",
      properties: {
        periodo: {
          type: "string",
          enum: [...PERIODOS_AGENDA],
          description:
            "'proximos' = de agora em diante (padrão); 'passados' = antes de agora, do mais recente ao mais antigo; 'semana' = próximos 7 dias; 'mes' = mês atual.",
        },
        status: {
          type: "string",
          enum: [...STATUS_COMPROMISSO],
          description: "pending (pendente), done (feito) ou archived (arquivado). Omita para todos.",
        },
        categoria: { type: "string", enum: [...CATEGORIAS_COMPROMISSO] },
        busca: { type: "string", description: "Palavra para procurar no título ou nas notas (ex: 'cardiologista')." },
      },
    },
  },
  {
    name: "atualizar_compromisso",
    description:
      "Atualiza um compromisso existente: marcar como feito, arquivar (também serve para tirar um compromisso duplicado ou criado por engano da agenda), voltar para pendente, mudar notas ou remarcar a data/hora. Precisa do id (pegue com listar_compromissos).",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Id do compromisso." },
        status: { type: "string", enum: [...STATUS_COMPROMISSO] },
        notas: { type: "string", description: "Novo texto das notas (substitui o anterior)." },
        data_hora: { type: "string", description: "Nova data e hora, formato YYYY-MM-DDTHH:MM (horário de Brasília)." },
      },
      required: ["id"],
    },
  },
];

// ---------------------------------------------------------------------
// Execução das ferramentas no Supabase
// ---------------------------------------------------------------------

type Entrada = Record<string, unknown>;
type Resultado = { ok: true; dados: unknown } | { ok: false; erro: string };

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const categoriaLivre = (v: unknown) =>
  texto(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") || "outros";
const umDe = <T extends string>(lista: readonly T[], v: unknown): T | undefined =>
  lista.includes(v as T) ? (v as T) : undefined;
// Texto simplificado para comparar (sem acento, minúsculas, sem pontuação)
const simplificar = (v: unknown) =>
  texto(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const parecidos = (a: unknown, b: unknown) => {
  const x = simplificar(a);
  const y = simplificar(b);
  return x === y || (x.length > 0 && y.length > 0 && (x.includes(y) || y.includes(x)));
};
// Tira caracteres que quebram o filtro do Supabase
const termoDeBusca = (v: unknown) => texto(v).replace(/[,()%*\\]/g, " ").trim();

export async function executarFerramenta(
  supabase: SupabaseClient,
  nome: string,
  entrada: Entrada,
): Promise<Resultado> {
  try {
    switch (nome) {
      case "registrar_receita":
        return await registrarLancamento(supabase, "income", entrada);
      case "registrar_gasto":
        return await registrarLancamento(supabase, "expense", entrada);
      case "consultar_financas":
        return await consultarFinancas(supabase, entrada);
      case "criar_compromisso":
        return await criarCompromisso(supabase, entrada);
      case "listar_compromissos":
        return await listarCompromissos(supabase, entrada);
      case "atualizar_compromisso":
        return await atualizarCompromisso(supabase, entrada);
      default:
        return { ok: false, erro: `Ferramenta desconhecida: ${nome}` };
    }
  } catch (e) {
    console.error(`Erro na ferramenta ${nome}:`, e);
    return { ok: false, erro: "Erro inesperado ao acessar o banco de dados." };
  }
}

async function saldoAtual(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc("finance_summary").single<{ balance_cents: number }>();
  if (error) throw error;
  return Number(data.balance_cents);
}

async function registrarLancamento(
  supabase: SupabaseClient,
  tipo: "income" | "expense",
  entrada: Entrada,
): Promise<Resultado> {
  const centavos = reaisParaCentavos(entrada.valor);
  if (centavos === null) return { ok: false, erro: "Valor inválido. Pergunte ao usuário o valor." };

  const data = entrada.data === undefined || entrada.data === "" ? hojeSP() : entrada.data;
  if (!dataValida(data)) return { ok: false, erro: "Data inválida. Use YYYY-MM-DD." };

  // Trava contra duplicado: mesmo lançamento registrado nos últimos 15 minutos
  if (entrada.confirmar_duplicado !== true) {
    const desde = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentes, error: erroRecentes } = await supabase
      .from("transactions")
      .select("id, description, date, created_at")
      .eq("type", tipo)
      .eq("amount_cents", centavos)
      .eq("date", data)
      .gte("created_at", desde);
    if (erroRecentes) throw erroRecentes;
    const igual = (recentes ?? []).find((r) => parecidos(r.description, entrada.descricao));
    if (igual) {
      return {
        ok: true,
        dados: {
          nao_registrado: true,
          motivo: `Já existe ${tipo === "income" ? "uma receita" : "um gasto"} igual registrado há poucos minutos (${formatarReais(centavos)}, "${igual.description}"). Nada foi gravado de novo.`,
          o_que_fazer:
            "Se o usuário estava só repetindo ou confirmando, diga que já estava registrado. Só registre de novo (com confirmar_duplicado=true) se ele disser que é outro lançamento.",
          saldo_atual: formatarReais(await saldoAtual(supabase)),
        },
      };
    }
  }

  const { data: linha, error } = await supabase
    .from("transactions")
    .insert({
      type: tipo,
      amount_cents: centavos,
      description: texto(entrada.descricao),
      category: categoriaLivre(entrada.categoria),
      date: data,
    })
    .select("id")
    .single();
  if (error) throw error;

  return {
    ok: true,
    dados: {
      registrado: tipo === "income" ? "receita" : "gasto",
      id: linha.id,
      valor: formatarReais(centavos),
      data: formatarData(data),
      categoria: categoriaLivre(entrada.categoria),
      saldo_atual: formatarReais(await saldoAtual(supabase)),
    },
  };
}

function periodoFinancas(entrada: Entrada): { inicio: string | null; fim: string | null; nome: string } {
  const inicio = dataValida(entrada.data_inicio) ? entrada.data_inicio : null;
  const fim = dataValida(entrada.data_fim) ? entrada.data_fim : null;
  if (inicio || fim) return { inicio, fim, nome: "personalizado" };

  const hoje = hojeSP();
  const periodo = umDe(PERIODOS_FINANCAS, entrada.periodo) ?? "mes";
  switch (periodo) {
    case "hoje":
      return { inicio: hoje, fim: hoje, nome: periodo };
    case "ontem": {
      const ontem = somarDias(hoje, -1);
      return { inicio: ontem, fim: ontem, nome: periodo };
    }
    case "semana":
      return { inicio: somarDias(hoje, -6), fim: hoje, nome: periodo };
    case "mes":
      return { ...limitesDoMes(hoje), nome: periodo };
    case "mes_passado":
      return { ...limitesDoMes(somarDias(limitesDoMes(hoje).inicio, -1)), nome: periodo };
    case "ano":
      return { inicio: `${hoje.slice(0, 4)}-01-01`, fim: `${hoje.slice(0, 4)}-12-31`, nome: periodo };
    case "tudo":
      return { inicio: null, fim: null, nome: periodo };
  }
}

async function consultarFinancas(supabase: SupabaseClient, entrada: Entrada): Promise<Resultado> {
  const { inicio, fim, nome } = periodoFinancas(entrada);
  const categoria = texto(entrada.categoria) ? categoriaLivre(entrada.categoria) : null;
  const tipo = umDe(["income", "expense"] as const, entrada.tipo);

  const { data: resumo, error } = await supabase
    .rpc("finance_summary", { p_start: inicio, p_end: fim, p_category: categoria })
    .single<{ income_cents: number; expense_cents: number; balance_cents: number }>();
  if (error) throw error;

  let consulta = supabase
    .from("transactions")
    .select("type, amount_cents, category, description, date")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);
  if (inicio) consulta = consulta.gte("date", inicio);
  if (fim) consulta = consulta.lte("date", fim);
  if (categoria) consulta = consulta.ilike("category", categoria);
  if (tipo) consulta = consulta.eq("type", tipo);
  const { data: lista, error: erroLista } = await consulta;
  if (erroLista) throw erroLista;

  return {
    ok: true,
    dados: {
      saldo_atual: formatarReais(await saldoAtual(supabase)),
      periodo: nome,
      de: inicio ? formatarData(inicio) : "início",
      ate: fim ? formatarData(fim) : "hoje",
      categoria: categoria ?? "todas",
      total_receitas_no_periodo: formatarReais(Number(resumo.income_cents)),
      total_gastos_no_periodo: formatarReais(Number(resumo.expense_cents)),
      saldo_do_periodo: formatarReais(Number(resumo.balance_cents)),
      lancamentos: (lista ?? []).map((l) => ({
        tipo: l.type === "income" ? "receita" : "gasto",
        valor: formatarReais(l.amount_cents),
        descricao: l.description,
        categoria: l.category,
        data: formatarData(l.date),
      })),
      observacao: (lista?.length ?? 0) === 30 ? "Mostrando só os 30 lançamentos mais recentes." : undefined,
    },
  };
}

function compromissoParaIA(c: {
  id: string;
  title: string;
  category: string;
  starts_at: string;
  status: string;
  notes: string | null;
}) {
  return {
    id: c.id,
    titulo: c.title,
    categoria: c.category,
    quando: formatarDataHora(c.starts_at),
    status: c.status,
    notas: c.notes ?? undefined,
  };
}

async function criarCompromisso(supabase: SupabaseClient, entrada: Entrada): Promise<Resultado> {
  const titulo = texto(entrada.titulo);
  if (!titulo) return { ok: false, erro: "Falta o título do compromisso." };
  const inicio = horaLocalParaISO(entrada.data_hora);
  if (!inicio) return { ok: false, erro: "Data/hora inválida ou sem horário. Pergunte o horário ao usuário." };
  const categoria = umDe(CATEGORIAS_COMPROMISSO, entrada.categoria) ?? "outros";

  // Trava contra duplicado: compromisso parecido no mesmo dia e horário
  const { data: mesmoHorario, error: erroBusca } = await supabase
    .from("appointments")
    .select("id, title, category, starts_at, status, notes")
    .eq("starts_at", inicio)
    .neq("status", "archived");
  if (erroBusca) throw erroBusca;
  const igual = (mesmoHorario ?? []).find((c) => parecidos(c.title, titulo) || c.category === categoria);
  if (igual) {
    return {
      ok: true,
      dados: {
        ja_existia: true,
        aviso: "Este compromisso já estava salvo. Nada foi criado de novo.",
        compromisso: compromissoParaIA(igual),
      },
    };
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({ title: titulo, starts_at: inicio, category: categoria, notes: texto(entrada.notas) || null })
    .select("id, title, category, starts_at, status, notes")
    .single();
  if (error) throw error;

  return { ok: true, dados: { criado: compromissoParaIA(data) } };
}

async function listarCompromissos(supabase: SupabaseClient, entrada: Entrada): Promise<Resultado> {
  const hoje = hojeSP();
  const agora = new Date().toISOString();
  const periodo = umDe(PERIODOS_AGENDA, entrada.periodo) ?? "proximos";

  let consulta = supabase
    .from("appointments")
    .select("id, title, category, starts_at, status, notes")
    .order("starts_at", { ascending: periodo !== "passados" })
    .limit(30);

  switch (periodo) {
    case "hoje":
      consulta = consulta.gte("starts_at", inicioDoDiaISO(hoje)).lte("starts_at", fimDoDiaISO(hoje));
      break;
    case "amanha": {
      const amanha = somarDias(hoje, 1);
      consulta = consulta.gte("starts_at", inicioDoDiaISO(amanha)).lte("starts_at", fimDoDiaISO(amanha));
      break;
    }
    case "semana":
      consulta = consulta.gte("starts_at", inicioDoDiaISO(hoje)).lte("starts_at", fimDoDiaISO(somarDias(hoje, 6)));
      break;
    case "mes": {
      const { inicio, fim } = limitesDoMes(hoje);
      consulta = consulta.gte("starts_at", inicioDoDiaISO(inicio)).lte("starts_at", fimDoDiaISO(fim));
      break;
    }
    case "proximos":
      consulta = consulta.gte("starts_at", agora);
      break;
    case "passados":
      consulta = consulta.lt("starts_at", agora);
      break;
    case "tudo":
      break;
  }

  const status = umDe(STATUS_COMPROMISSO, entrada.status);
  if (status) consulta = consulta.eq("status", status);
  const categoria = umDe(CATEGORIAS_COMPROMISSO, entrada.categoria);
  if (categoria) consulta = consulta.eq("category", categoria);
  const busca = termoDeBusca(entrada.busca);
  if (busca) consulta = consulta.or(`title.ilike.%${busca}%,notes.ilike.%${busca}%`);

  const { data, error } = await consulta;
  if (error) throw error;

  return {
    ok: true,
    dados: {
      periodo,
      quantidade: data.length,
      compromissos: data.map(compromissoParaIA),
    },
  };
}

async function atualizarCompromisso(supabase: SupabaseClient, entrada: Entrada): Promise<Resultado> {
  const id = texto(entrada.id);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, erro: "Id inválido. Use listar_compromissos para achar o id." };

  const mudancas: Record<string, unknown> = {};
  const status = umDe(STATUS_COMPROMISSO, entrada.status);
  if (status) mudancas.status = status;
  if (typeof entrada.notas === "string") mudancas.notes = entrada.notas.trim() || null;
  if (entrada.data_hora !== undefined) {
    const inicio = horaLocalParaISO(entrada.data_hora);
    if (!inicio) return { ok: false, erro: "Nova data/hora inválida." };
    mudancas.starts_at = inicio;
  }
  if (Object.keys(mudancas).length === 0) return { ok: false, erro: "Nada para atualizar." };

  const { data, error } = await supabase
    .from("appointments")
    .update(mudancas)
    .eq("id", id)
    .select("id, title, category, starts_at, status, notes")
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, erro: "Compromisso não encontrado." };

  return { ok: true, dados: { atualizado: compromissoParaIA(data) } };
}
