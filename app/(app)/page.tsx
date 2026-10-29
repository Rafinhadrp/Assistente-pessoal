import { BotaoAtualizar } from "@/components/AtualizarApp";
import Chat, { type MensagemChat } from "@/components/Chat";
import LogoAssistente from "@/components/LogoAssistente";
import { separarHumor } from "@/lib/humor";
import { sair } from "@/app/login/actions";
import { criarClienteServidor } from "@/lib/supabase/server";

export default async function PaginaChat() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("messages")
    .select("id, role, content")
    .order("created_at", { ascending: false })
    .limit(50);
  // As respostas são guardadas com a etiqueta de humor do mascote: separa aqui
  const historico = ((data ?? []) as MensagemChat[]).reverse().map((m) => {
    if (m.role !== "assistant") return m;
    const { humor, texto } = separarHumor(m.content);
    return { ...m, content: texto, humor };
  });

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <LogoAssistente tamanho={34} humor="parado" />
          Assistente
        </h1>
        <div className="flex items-center gap-2">
          <BotaoAtualizar />
          <form action={sair}>
            <button className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
              Sair
            </button>
          </form>
        </div>
      </header>
      <Chat historico={historico} />
    </>
  );
}
