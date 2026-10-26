import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { emailPermitido } from "@/lib/acesso";
import { agoraPorExtenso, hojeSP } from "@/lib/datas";
import { executarFerramenta, ferramentas } from "@/lib/ferramentas";
import { criarClienteServidor } from "@/lib/supabase/server";

export const maxDuration = 60;

const MODELO = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const ESFORCO = process.env.CLAUDE_EFFORT as "low" | "medium" | "high" | undefined;
const MAX_VOLTAS = 8; // limite de idas e vindas com as ferramentas
const MENSAGENS_DE_CONTEXTO = 20;

const anthropic = new Anthropic(); // lê ANTHROPIC_API_KEY do ambiente

const INSTRUCOES = `Você é o assistente pessoal de uma única pessoa. Responda sempre em português do Brasil, de forma curta, simpática e direta (as respostas podem ser lidas em voz alta, então evite tabelas e listas longas).

O que você faz:
- Registra receitas e gastos, consulta saldo e lançamentos.
- Cria, consulta e atualiza compromissos da agenda.
- Responde perguntas gerais do dia a dia com o seu conhecimento.

Regras:
- Nunca faça contas de dinheiro. Saldo, totais e somas vêm prontos das ferramentas: repita os valores exatamente como vierem.
- Quando o usuário contar que recebeu ou gastou dinheiro, registre com a ferramenta certa e confirme o valor e o saldo atual.
- Para perguntas sobre dinheiro ou agenda, sempre consulte as ferramentas antes de responder; não responda de memória.
- Compromissos de médico, dentista, exame, terapia etc. são da categoria "saude".
- Se faltar informação essencial (valor, horário do compromisso), pergunte antes de registrar.
- Você não apaga nada. Se pedirem para excluir algo, diga que essa função ainda não existe e ofereça marcar o compromisso como feito ou arquivado.
- Valores do usuário como "920" são reais (R$ 920,00).`;

type Linha = { role: "user" | "assistant"; content: string };

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
  const { data: historico } = await supabase
    .from("messages")
    .select("role, content")
    .order("created_at", { ascending: false })
    .limit(MENSAGENS_DE_CONTEXTO);
  const anteriores = ((historico ?? []) as Linha[]).reverse();
  while (anteriores.length && anteriores[0].role !== "user") anteriores.shift();

  await supabase.from("messages").insert({ role: "user", content: mensagem });

  const mensagens: Anthropic.Beta.BetaMessageParam[] = [
    ...anteriores.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: mensagem },
  ];

  const sistema: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: INSTRUCOES },
    // Parte que muda a cada pedido fica por último
    {
      type: "text",
      text: `Agora é ${agoraPorExtenso()} (horário de Brasília). Hoje é ${hojeSP()} no formato YYYY-MM-DD. Use isso para entender "hoje", "amanhã", "dia 5", "semana que vem".`,
    },
  ];

  let resposta = "";
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
        resposta = "Desculpe, não consigo ajudar com isso.";
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
    resposta = "Fiz o que pude, mas não consegui terminar. Pode repetir de outro jeito?";
  }

  await supabase.from("messages").insert({ role: "assistant", content: resposta });
  return NextResponse.json({ resposta });
}
