import { BotaoAtualizar } from "@/components/AtualizarApp";
import Chat, { type MensagemChat } from "@/components/Chat";
import ListaConversas, { LinkNovaConversa } from "@/components/ListaConversas";
import LogoAssistente from "@/components/LogoAssistente";
import Cabecalho from "@/components/ui/Cabecalho";
import { FUSO } from "@/lib/datas";
import { separarHumor } from "@/lib/humor";
import { criarClienteServidor } from "@/lib/supabase/server";

function saudacao() {
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  if (hora >= 5 && hora < 12) return "Bom dia!";
  if (hora >= 12 && hora < 18) return "Boa tarde!";
  return "Boa noite!";
}

const ID = /^[0-9a-f-]{36}$/i;

export default async function PaginaChat({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; nova?: string }>;
}) {
  const params = await searchParams;
  const supabase = await criarClienteServidor();

  // Conversas: abre a pedida, ou a mais recente; "nova" começa uma em branco
  const { data: conversas, error: semConversas } = await supabase
    .from("conversations")
    .select("id, title")
    .order("updated_at", { ascending: false })
    .limit(100);
  const comConversas = !semConversas;
  const atual = params.nova
    ? null
    : (conversas?.find((c) => c.id === params.c) ?? (ID.test(params.c ?? "") ? null : conversas?.[0]) ?? null);

  type Linha = MensagemChat & { extras?: { buscas?: number; fontes?: MensagemChat["fontes"] } | null };
  const buscar = (colunas: string) => {
    let q = supabase.from("messages").select(colunas);
    if (comConversas && atual) q = q.eq("conversation_id", atual.id);
    return q.order("created_at", { ascending: false }).limit(60).returns<Linha[]>();
  };
  let data: Linha[] | null = [];
  if (!comConversas || atual) {
    let resultado = await buscar("id, role, content, extras");
    if (resultado.error) resultado = await buscar("id, role, content"); // banco ainda sem a coluna "extras"
    data = resultado.data;
  }

  // As respostas são guardadas com a etiqueta de humor do mascote: separa aqui
  const historico: MensagemChat[] = (data ?? []).reverse().map(({ extras, ...m }) => {
    if (m.role !== "assistant") return m;
    const { humor, texto } = separarHumor(m.content);
    return { ...m, content: texto, humor, buscas: extras?.buscas ?? 0, fontes: extras?.fontes ?? [] };
  });

  return (
    <>
      <Cabecalho
        titulo="Assistente"
        subtitulo={comConversas ? (atual?.title ?? "Nova conversa") : "Finanças, agenda e o que mais precisar"}
        icone={
          <>
            {comConversas && <ListaConversas atual={atual?.id ?? null} />}
            <LogoAssistente tamanho={40} humor="parado" />
          </>
        }
        acoes={
          <>
            {comConversas && <LinkNovaConversa />}
            <BotaoAtualizar />
          </>
        }
      />
      <Chat
        // Trocar de conversa recomeça o chat com o histórico dela
        key={atual?.id ?? `nova-${params.nova ?? ""}`}
        historico={historico}
        saudacao={saudacao()}
        conversa={atual?.id ?? null}
      />
    </>
  );
}
