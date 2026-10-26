import Chat, { type MensagemChat } from "@/components/Chat";
import { sair } from "@/app/login/actions";
import { criarClienteServidor } from "@/lib/supabase/server";

export default async function PaginaChat() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("messages")
    .select("id, role, content")
    .order("created_at", { ascending: false })
    .limit(50);
  const historico = ((data ?? []) as MensagemChat[]).reverse();

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <h1 className="text-lg font-semibold">Assistente</h1>
        <form action={sair}>
          <button className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
            Sair
          </button>
        </form>
      </header>
      <Chat historico={historico} />
    </>
  );
}
