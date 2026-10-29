import Link from "next/link";
import AvisoBanco, { bancoDesatualizado } from "@/components/AvisoBanco";
import ListaCompromissos, { type Compromisso } from "@/components/ListaCompromissos";
import Mascote from "@/components/Mascote";
import Cabecalho, { BotaoIcone } from "@/components/ui/Cabecalho";
import { IconeLixeira } from "@/components/ui/Icones";
import { hojeSP, inicioDoDiaISO } from "@/lib/datas";
import { criarClienteServidor } from "@/lib/supabase/server";

export default async function PaginaAgenda({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams;
  const historico = aba === "historico";
  const inicioDeHoje = inicioDoDiaISO(hojeSP());

  const supabase = await criarClienteServidor();
  await supabase.rpc("limpar_lixeira"); // apaga de vez o que está na lixeira há mais de 30 dias

  const colunas = "id, title, category, starts_at, status, notes, edited_at";
  const { data, error } = historico
    ? await supabase
        .from("appointments")
        .select(colunas)
        .is("deleted_at", null)
        .or(`status.neq.pending,starts_at.lt.${inicioDeHoje}`)
        .order("starts_at", { ascending: false })
        .limit(100)
    : await supabase
        .from("appointments")
        .select(colunas)
        .is("deleted_at", null)
        .eq("status", "pending")
        .gte("starts_at", inicioDeHoje)
        .order("starts_at", { ascending: true });
  const compromissos = (data ?? []) as Compromisso[];
  const proximo = !historico ? compromissos[0] : undefined;

  const aba_ = (ativa: boolean) =>
    `flex-1 rounded-xl py-2 text-center text-sm font-semibold transition ${
      ativa ? "bg-superficie-forte text-texto shadow-sm" : "text-suave hover:text-texto"
    }`;

  return (
    <>
      <Cabecalho
        titulo="Agenda"
        subtitulo={
          historico
            ? "O que já passou"
            : compromissos.length
              ? `${compromissos.length} ${compromissos.length === 1 ? "compromisso pela frente" : "compromissos pela frente"}`
              : "Tudo tranquilo por aqui"
        }
        acoes={
          <BotaoIcone rotulo="Lixeira" href="/lixeira">
            <IconeLixeira />
          </BotaoIcone>
        }
      />

      <main className="space-y-5 px-4 pb-8 pt-4">
        <div className="vidro flex gap-1 rounded-2xl p-1">
          <Link href="/agenda" className={aba_(!historico)}>
            Próximos
          </Link>
          <Link href="/agenda?aba=historico" className={aba_(historico)}>
            Histórico
          </Link>
        </div>

        {bancoDesatualizado(error) ? (
          <AvisoBanco />
        ) : compromissos.length === 0 ? (
          <div className="cartao animate-entrar p-8 text-center">
            <Mascote humor={historico ? "bocejando" : "dormindo"} tamanho={88} className="mx-auto" />
            <p className="mt-2 font-semibold">{historico ? "Nada no histórico ainda" : "Nenhum compromisso"}</p>
            <p className="mt-1 text-sm text-suave">
              {historico ? (
                "Quando os compromissos passarem, eles aparecem aqui."
              ) : (
                <>
                  Conte no chat: <span className="text-texto">“tenho médico dia 5 às 14h”</span>.
                </>
              )}
            </p>
          </div>
        ) : (
          <>
            {proximo && (
              <p className="px-1 text-sm text-suave">
                Próximo: <span className="font-semibold text-texto">{proximo.title}</span>
              </p>
            )}
            <ListaCompromissos compromissos={compromissos} agruparPorCategoria={!historico} />
          </>
        )}
      </main>
    </>
  );
}
