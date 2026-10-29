import { BotaoAtualizar } from "@/components/AtualizarApp";
import Chat, { type MensagemChat } from "@/components/Chat";
import LogoAssistente from "@/components/LogoAssistente";
import Cabecalho from "@/components/ui/Cabecalho";
import { IconeSair } from "@/components/ui/Icones";
import { sair } from "@/app/login/actions";
import { FUSO } from "@/lib/datas";
import { separarHumor } from "@/lib/humor";
import { criarClienteServidor } from "@/lib/supabase/server";

function saudacao() {
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  if (hora >= 5 && hora < 12) return "Bom dia!";
  if (hora >= 12 && hora < 18) return "Boa tarde!";
  return "Boa noite!";
}

export default async function PaginaChat() {
  const supabase = await criarClienteServidor();
  type Linha = MensagemChat & { extras?: { buscas?: number; fontes?: MensagemChat["fontes"] } | null };
  const buscar = (colunas: string) =>
    supabase.from("messages").select(colunas).order("created_at", { ascending: false }).limit(50).returns<Linha[]>();
  let { data, error } = await buscar("id, role, content, extras");
  if (error) ({ data } = await buscar("id, role, content")); // banco ainda sem a coluna "extras"

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
        subtitulo="Finanças, agenda e o que mais precisar"
        icone={<LogoAssistente tamanho={40} humor="parado" />}
        acoes={
          <>
            <BotaoAtualizar />
            <form action={sair}>
              <button
                aria-label="Sair"
                title="Sair"
                className="grid h-10 w-10 place-items-center rounded-full text-suave transition hover:bg-superficie-2 hover:text-texto active:scale-95"
              >
                <IconeSair />
              </button>
            </form>
          </>
        }
      />
      <Chat historico={historico} saudacao={saudacao()} />
    </>
  );
}
