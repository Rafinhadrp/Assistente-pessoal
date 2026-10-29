import Link from "next/link";
import AvisoBanco, { bancoDesatualizado } from "@/components/AvisoBanco";
import ListaLancamentos, { type Lancamento } from "@/components/ListaLancamentos";
import Mascote from "@/components/Mascote";
import Cabecalho, { BotaoIcone } from "@/components/ui/Cabecalho";
import { IconeAvancar, IconeLixeira, IconeSetaBaixo, IconeSetaCima, IconeVoltar } from "@/components/ui/Icones";
import { hojeSP, limitesDoMes, somarDias } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { criarClienteServidor } from "@/lib/supabase/server";

type Resumo = { income_cents: number; expense_cents: number; balance_cents: number };

const nomeDoMes = (mes: string) => {
  const t = new Date(`${mes}-15T12:00:00Z`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export default async function PaginaFinancas({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; categoria?: string }>;
}) {
  const params = await searchParams;
  const mesAtual = hojeSP().slice(0, 7);
  const mes = /^\d{4}-\d{2}$/.test(params.mes ?? "") ? params.mes! : mesAtual;
  const categoria = params.categoria?.trim() || null;
  const { inicio, fim } = limitesDoMes(mes);
  const mesAnterior = somarDias(inicio, -1).slice(0, 7);
  const mesSeguinte = somarDias(fim, 1).slice(0, 7);
  const link = (m: string, c: string | null) =>
    `/financas?${new URLSearchParams({ ...(m !== mesAtual ? { mes: m } : {}), ...(c ? { categoria: c } : {}) })}`;

  const supabase = await criarClienteServidor();
  await supabase.rpc("limpar_lixeira"); // apaga de vez o que está na lixeira há mais de 30 dias

  // Todas as contas são feitas pelo banco (função finance_summary)
  const [saldo, doMes, lista, categorias] = await Promise.all([
    supabase.rpc("finance_summary").single<Resumo>(),
    supabase.rpc("finance_summary", { p_start: inicio, p_end: fim, p_category: categoria }).single<Resumo>(),
    (() => {
      let q = supabase
        .from("transactions")
        .select("id, type, amount_cents, category, description, date, edited_at")
        .is("deleted_at", null)
        .gte("date", inicio)
        .lte("date", fim)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (categoria) q = q.ilike("category", categoria);
      return q;
    })(),
    supabase.from("transactions").select("category").is("deleted_at", null).limit(1000),
  ]);

  const desatualizado = bancoDesatualizado(lista.error);
  const saldoAtual = Number(saldo.data?.balance_cents ?? 0);
  const receitas = Number(doMes.data?.income_cents ?? 0);
  const gastos = Number(doMes.data?.expense_cents ?? 0);
  const lancamentos = (lista.data ?? []) as Lancamento[];
  const listaCategorias = [...new Set((categorias.data ?? []).map((c) => c.category as string))].sort();

  return (
    <>
      <Cabecalho
        titulo="Finanças"
        subtitulo="Seu dinheiro, sem complicação"
        acoes={
          <BotaoIcone rotulo="Lixeira" href="/lixeira">
            <IconeLixeira />
          </BotaoIcone>
        }
      />

      <main className="space-y-5 px-4 pb-8 pt-4">
        {/* Saldo: cartão de vidro com um brilho azul suave */}
        <section className="cartao relative animate-entrar overflow-hidden p-5">
          <div
            aria-hidden
            className="absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-50 blur-3xl"
            style={{ background: "var(--mancha-1)" }}
          />
          <div className="relative">
            <p className="text-sm font-medium text-suave">Saldo atual</p>
            <p
              className={`numeros mt-1 text-[2.5rem] font-bold leading-none tracking-tight ${
                saldoAtual < 0 ? "text-gasto" : ""
              }`}
            >
              {formatarReais(saldoAtual)}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-receita-suave p-3">
                <p className="flex items-center gap-1 text-xs font-medium text-receita">
                  <IconeSetaBaixo className="h-3.5 w-3.5" /> Entrou no mês
                </p>
                <p className="numeros mt-1 text-lg font-bold text-receita">{formatarReais(receitas)}</p>
              </div>
              <div className="rounded-2xl bg-gasto-suave p-3">
                <p className="flex items-center gap-1 text-xs font-medium text-gasto">
                  <IconeSetaCima className="h-3.5 w-3.5" /> Saiu no mês
                </p>
                <p className="numeros mt-1 text-lg font-bold text-gasto">{formatarReais(gastos)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Mês: setinhas para voltar e avançar */}
        <nav className="flex items-center justify-between" aria-label="Escolher mês">
          <Link
            href={link(mesAnterior, categoria)}
            aria-label="Mês anterior"
            className="vidro grid h-10 w-10 place-items-center rounded-full text-suave hover:text-texto"
          >
            <IconeVoltar />
          </Link>
          <p className="font-semibold">{nomeDoMes(mes)}</p>
          <Link
            href={link(mesSeguinte, categoria)}
            aria-label="Próximo mês"
            className={`vidro grid h-10 w-10 place-items-center rounded-full text-suave hover:text-texto ${
              mes >= mesAtual ? "pointer-events-none opacity-30" : ""
            }`}
            aria-disabled={mes >= mesAtual}
          >
            <IconeAvancar />
          </Link>
        </nav>

        {/* Categorias: chips que rolam para o lado */}
        {listaCategorias.length > 0 && (
          <div className="sem-barra -mx-4 flex gap-2 overflow-x-auto px-4">
            <Link href={link(mes, null)} className={`chip ${!categoria ? "chip-ativo" : ""}`}>
              Todas
            </Link>
            {listaCategorias.map((c) => (
              <Link key={c} href={link(mes, c)} className={`chip capitalize ${categoria === c ? "chip-ativo" : ""}`}>
                {c}
              </Link>
            ))}
          </div>
        )}

        {desatualizado ? (
          <AvisoBanco />
        ) : lancamentos.length === 0 ? (
          <div className="cartao animate-entrar p-8 text-center">
            <Mascote humor="fininho" tamanho={88} className="mx-auto" />
            <p className="mt-2 font-semibold">Nada por aqui ainda</p>
            <p className="mt-1 text-sm text-suave">
              Conte no chat, do seu jeito: <span className="text-texto">“gastei 35 no mercado”</span>.
            </p>
          </div>
        ) : (
          <ListaLancamentos lancamentos={lancamentos} categorias={listaCategorias} />
        )}
      </main>
    </>
  );
}
