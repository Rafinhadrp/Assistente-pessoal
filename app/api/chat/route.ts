import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { emailPermitido } from "@/lib/acesso";
import { formatarReais } from "@/lib/dinheiro";
import { agoraPorExtenso, formatarData, formatarDataHora, hojeSP, inicioDoDiaISO } from "@/lib/datas";
import { executarFerramenta, ferramentas } from "@/lib/ferramentas";
import { HUMORES, separarHumor } from "@/lib/humor";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const MODELO = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const ESFORCO = process.env.CLAUDE_EFFORT as "low" | "medium" | "high" | undefined;
const MAX_VOLTAS = 8; // limite de idas e vindas com as ferramentas
const MENSAGENS_DE_CONTEXTO = 20;

const anthropic = new Anthropic(); // lê ANTHROPIC_API_KEY do ambiente

const INSTRUCOES = `Você é o assistente pessoal de uma única pessoa. Responda sempre em português do Brasil, de forma curta, simpática e natural, como numa conversa (as respostas podem ser lidas em voz alta: evite tabelas, listas longas e emojis em excesso).

O que você faz:
- Registra receitas e gastos, consulta saldo e lançamentos.
- Cria, consulta, remarca e atualiza compromissos da agenda.
- Responde perguntas gerais do dia a dia com o seu conhecimento.

Como entender o usuário (ele costuma falar por voz, então o texto pode vir sem pontuação ou com erros de reconhecimento):
- "doze e cinquenta" = 12,50; "cinquentinha" = 50; "mil e duzentos" = 1200; "920" = R$ 920,00.
- Interprete pelo sentido. Se uma palavra parecer mal reconhecida, use o contexto; se mudar o significado (valor, data, horário), pergunte.
- Mensagens soltas ou sem pedido claro (ex: "fala", "oi", "e aí", "tá", "ok") são só conversa: responda brevemente e pergunte como pode ajudar. Nunca repita ou refaça ações anteriores por causa delas.

Seu mascote:
- O app mostra um mascote (o <R/>, um robozinho em pixel art) ao lado de cada resposta sua. Comece TODA resposta com a etiqueta [humor:NOME], escolhendo a carinha que combina com o que você vai dizer. Opções: ${HUMORES.join(", ")}.
- Exemplos: recebeu dinheiro = feliz ou dancando; gasto alto = assustado; saldo negativo = chorando; piada = rindo; dúvida ou pergunta = pensando; cumprimento = acenando; boa noite = dormindo; algo deu errado = erro.
- A etiqueta não aparece nem é lida para o usuário; não comente sobre ela.

Regras de verdade (muito importantes):
- Só diga que registrou, salvou, marcou ou alterou algo depois que a ferramenta devolver sucesso nesta mesma resposta, e confirme com os dados que ela devolveu.
- No histórico, as respostas anteriores trazem um bloco "[Ações executadas pelo sistema: ...]". Ele é escrito pelo sistema e é a verdade sobre o que foi salvo. Se uma ação aparece ali, ela foi feita: nunca a refaça. Se uma resposta antiga sua disse que fez algo e não há esse bloco, verifique com as ferramentas antes de concluir qualquer coisa. Nunca escreva esse bloco você mesmo.
- A seção "Situação atual" abaixo mostra os dados reais do banco agora. Use-a para checar antes de criar algo (evite duplicar) e para responder rápido.
- Se uma ferramenta disser que algo já existia ou não foi gravado, explique isso ao usuário com naturalidade, sem inventar.
- Se você perceber que algo foi registrado em duplicidade ou por engano, avise e ofereça arquivar o compromisso extra (atualizar_compromisso com status archived).

Regras de dinheiro e agenda:
- Nunca faça contas de dinheiro. Saldo, totais e somas vêm prontos das ferramentas ou da "Situação atual": repita os valores exatamente como vierem.
- Quando o usuário contar que recebeu ou gastou dinheiro, registre com a ferramenta certa e confirme o valor e o saldo atual.
- Para perguntas sobre dinheiro ou agenda que a "Situação atual" não responde, consulte as ferramentas; nunca responda de memória.
- Compromissos de médico, dentista, exame, terapia etc. são da categoria "saude".
- Se faltar informação essencial (valor, dia ou horário do compromisso), pergunte antes de registrar.
- Você não apaga nada. Se pedirem para excluir algo, explique que dá para apagar direto nas abas Finanças ou Agenda: é só arrastar o item para o lado (ele vai para a lixeira por 30 dias). Também pode oferecer marcar o compromisso como feito ou arquivado.`;

type Linha = { role: "user" | "assistant"; content: string; actions?: string | null };

// Retrato dos dados reais agora, para a IA conferir antes de agir
async function situacaoAtual(supabase: SupabaseClient): Promise<string> {
  const [saldo, compromissos, lancamentos] = await Promise.all([
    supabase.rpc("finance_summary").single<{ balance_cents: number }>(),
    supabase
      .from("appointments")
      .select("id, title, category, starts_at")
      .is("deleted_at", null)
      .eq("status", "pending")
      .gte("starts_at", inicioDoDiaISO(hojeSP()))
      .order("starts_at", { ascending: true })
      .limit(10),
    supabase
      .from("transactions")
      .select("type, amount_cents, description, date")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const linhas = ["Situação atual (dados reais do banco neste momento):"];
  linhas.push(`- Saldo atual: ${saldo.data ? formatarReais(Number(saldo.data.balance_cents)) : "indisponível"}`);
  linhas.push("- Próximos compromissos pendentes:");
  if (compromissos.data?.length) {
    for (const c of compromissos.data) {
      linhas.push(`  • ${formatarDataHora(c.starts_at)} | ${c.title} | ${c.category} | id ${c.id}`);
    }
  } else {
    linhas.push("  (nenhum)");
  }
  linhas.push("- Últimos lançamentos registrados:");
  if (lancamentos.data?.length) {
    for (const l of lancamentos.data) {
      linhas.push(
        `  • ${formatarData(l.date)} | ${l.type === "income" ? "receita" : "gasto"} | ${formatarReais(l.amount_cents)} | ${l.description}`,
      );
    }
  } else {
    linhas.push("  (nenhum)");
  }
  return linhas.join("\n");
}

// Resumo curto do que uma ferramenta fez, para guardar no histórico
function resumoDaAcao(nome: string, entrada: unknown, saida: unknown, ok: boolean): string {
  const json = (v: unknown) => {
    const t = JSON.stringify(v) ?? "";
    return t.length > 400 ? `${t.slice(0, 400)}…` : t;
  };
  if (!ok) return `${nome} FALHOU: ${json(saida)}`;
  // Consultas não mudam nada; basta registrar que foram feitas
  if (nome.startsWith("consultar_") || nome.startsWith("listar_")) return `${nome}(${json(entrada)}) consultado`;
  return `${nome}: ${json(saida)}`;
}

// Junta a resposta com o registro do que o sistema fez (só a IA vê isso)
function conteudoComAcoes(m: Linha): string {
  return m.actions ? `${m.content}\n\n[Ações executadas pelo sistema: ${m.actions}]` : m.content;
}

export async function POST(request: Request) {
  const supabase = await criarClienteServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ erro: "Faça login de novo." }, { status: 401 });
  }
  if (!emailPermitido(auth.user.email)) {
    return NextResponse.json({ erro: "Este e-mail não tem acesso ao assistente." }, { status: 403 });
  }

  const corpo = await request.json().catch(() => null);
  const mensagem = typeof corpo?.mensagem === "string" ? corpo.mensagem.trim() : "";
  if (!mensagem) {
    return NextResponse.json({ erro: "Mensagem vazia." }, { status: 400 });
  }
  if (mensagem.length > 4000) {
    return NextResponse.json({ erro: "Mensagem muito longa." }, { status: 400 });
  }

  // Histórico recente do chat, do mais antigo para o mais novo
  const buscarHistorico = (colunas: string) =>
    supabase
      .from("messages")
      .select(colunas)
      .order("created_at", { ascending: false })
      .limit(MENSAGENS_DE_CONTEXTO)
      .returns<Linha[]>();
  let { data: historico, error: erroHistorico } = await buscarHistorico("role, content, actions");
  if (erroHistorico) {
    // Coluna "actions" ainda não criada no banco: segue sem ela
    ({ data: historico } = await buscarHistorico("role, content"));
  }
  const anteriores = (historico ?? []).reverse();
  while (anteriores.length && anteriores[0].role !== "user") anteriores.shift();

  await supabase.from("messages").insert({ role: "user", content: mensagem });

  const mensagens: Anthropic.Beta.BetaMessageParam[] = [
    ...anteriores.map((m) => ({ role: m.role, content: m.role === "assistant" ? conteudoComAcoes(m) : m.content })),
    { role: "user", content: mensagem },
  ];

  const sistema: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: INSTRUCOES },
    // Parte que muda a cada pedido fica por último
    {
      type: "text",
      text: `Agora é ${agoraPorExtenso()} (horário de Brasília). Hoje é ${hojeSP()} no formato YYYY-MM-DD. Use isso para entender "hoje", "amanhã", "dia 5", "semana que vem".\n\n${await situacaoAtual(supabase)}`,
    },
  ];

  let resposta = "";
  const acoes: string[] = [];
  try {
    for (let volta = 0; volta < MAX_VOLTAS; volta++) {
      const msg = await anthropic.beta.messages.create({
        model: MODELO,
        max_tokens: 16000,
        system: sistema,
        tools: ferramentas,
        messages: mensagens,
        // Se o modelo recusar por política, a API tenta um modelo reserva sozinha
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        ...(ESFORCO ? { output_config: { effort: ESFORCO } } : {}),
      });

      if (msg.stop_reason === "refusal") {
        resposta = "[humor:desconfiado] Desculpe, não consigo ajudar com isso.";
        break;
      }

      const chamadas = msg.content.filter(
        (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
      );

      // Guarda a resposta completa (inclusive blocos de raciocínio) para a próxima volta
      mensagens.push({ role: "assistant", content: msg.content });

      if (msg.stop_reason === "pause_turn") continue;

      if (chamadas.length === 0 || msg.stop_reason !== "tool_use") {
        resposta = msg.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        break;
      }

      const resultados: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const chamada of chamadas) {
        const resultado = await executarFerramenta(
          supabase,
          chamada.name,
          (chamada.input ?? {}) as Record<string, unknown>,
        );
        acoes.push(
          resumoDaAcao(chamada.name, chamada.input, resultado.ok ? resultado.dados : resultado.erro, resultado.ok),
        );
        resultados.push({
          type: "tool_result",
          tool_use_id: chamada.id,
          content: JSON.stringify(resultado.ok ? resultado.dados : { erro: resultado.erro }),
          is_error: !resultado.ok,
        });
      }
      mensagens.push({ role: "user", content: resultados });
    }
  } catch (erro) {
    console.error("Erro ao chamar o Claude:", erro);
    let texto = "Não consegui falar com a IA agora. Tente de novo em instantes.";
    if (erro instanceof Anthropic.AuthenticationError) {
      texto = "A chave da API do Claude (ANTHROPIC_API_KEY) está faltando ou é inválida.";
    } else if (erro instanceof Anthropic.NotFoundError) {
      texto = `O modelo "${MODELO}" não foi encontrado. Confira a variável CLAUDE_MODEL.`;
    } else if (erro instanceof Anthropic.RateLimitError) {
      texto = "Muitos pedidos seguidos. Espere um pouco e tente de novo.";
    } else if (erro instanceof Anthropic.BadRequestError) {
      texto = "A IA recusou o pedido (erro de configuração). Veja o terminal para detalhes.";
    }
    return NextResponse.json({ erro: texto }, { status: 502 });
  }

  if (!resposta) {
    resposta = "[humor:tonto] Fiz o que pude, mas não consegui terminar. Pode repetir de outro jeito?";
  }

  // Guarda com a etiqueta de humor (a IA vê no histórico); a tela recebe separado
  const { humor, texto } = separarHumor(resposta);
  resposta = `[humor:${humor}] ${texto}`;
  const registro = acoes.length ? acoes.join(" | ") : null;
  const { error: erroSalvar } = await supabase
    .from("messages")
    .insert({ role: "assistant", content: resposta, actions: registro });
  if (erroSalvar) {
    // Coluna "actions" ainda não criada no banco: salva só o texto
    await supabase.from("messages").insert({ role: "assistant", content: resposta });
  }
  return NextResponse.json({ resposta: texto, humor });
}
