import Mascote from "@/components/Mascote";
import { formatarReais } from "@/lib/dinheiro";
import { formatarData, hojeSP, limitesDoMes } from "@/lib/datas";
import { criarClienteServidor } from "@/lib/supabase/server";

type Resumo = { income_cents: number; expense_cents: number; balance_cents: number };
type Lancamento = {
  id: string;
  type: "income" | "expense";
  amount_cents: number;
  category: string;
  description: string;
  date: string;
};

export default async function PaginaFinancas({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; categoria?: string }>;
}) {
  const params = await searchParams;
  const mes = /^\d{4}-\d{2}$/.test(params.mes ?? "") ? params.mes! : hojeSP().slice(0, 7);
  const categoria = params.categoria?.trim() || null;
  const { inicio, fim } = limitesDoMes(mes);

  const supabase = await criarClienteServidor();
  // Todas as contas são feitas pelo banco (função finance_summary)
  const [saldo, doMes, lista, categorias] = await Promise.all([
    supabase.rpc("finance_summary").single<Resumo>(),
    supabase.rpc("finance_summary", { p_start: inicio, p_end: fim, p_category: categoria }).single<Resumo>(),
    (() => {
      let q = supabase
        .from("transactions")
        .select("id, type, amount_cents, category, description, date")
        .gte("date", inicio)
        .lte("date", fim)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (categoria) q = q.ilike("category", categoria);
      return q;
    })(),
    supabase.from("transactions").select("category").limit(1000),
  ]);

  const saldoAtual = Number(saldo.data?.balance_cents ?? 0);
  const receitas = Number(doMes.data?.income_cents ?? 0);
  const gastos = Number(doMes.data?.expense_cents ?? 0);
  const lancamentos = (lista.data ?? []) as Lancamento[];
  const listaCategorias = [...new Set((categorias.data ?? []).map((c) => c.category as string))].sort();
  const nomeMes = new Date(`${mes}-15T12:00:00Z`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <main className="space-y-5 px-4 pb-6 pt-[calc(1rem+env(safe-area-inset-top))]">
      <h1 className="text-lg font-semibold">Finanças</h1>

      <section className="rounded-2xl bg-indigo-600 p-5 text-white shadow-lg">
        <p className="text-sm text-indigo-100">Saldo atual</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{formatarReais(saldoAtual)}</p>
      </section>

      <form className="flex flex-wrap items-end gap-2" method="get">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Mês</span>
          <input
            type="month"
            name="mes"
            defaultValue={mes}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Categoria</span>
          <select
            name="categoria"
            defaultValue={categoria ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">Todas</option>
            {listaCategorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-xl bg-slate-900 px-4 py-2 text-white dark:bg-slate-100 dark:text-slate-900">
          Filtrar
        </button>
      </form>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Receitas em {nomeMes}</p>
          <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
            {formatarReais(receitas)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Gastos em {nomeMes}</p>
          <p className="mt-1 text-lg font-semibold text-rose-600 dark:text-rose-400">{formatarReais(gastos)}</p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Lançamentos</h2>
        {lancamentos.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
            <Mascote humor="fininho" tamanho={72} className="mx-auto mb-2" />
            Nenhum lançamento neste mês. Conte no chat: “gastei 35 no mercado”.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
            {lancamentos.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{l.description || l.category}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatarData(l.date)} · {l.category}
                  </p>
                </div>
                <p
                  className={`shrink-0 font-semibold ${
                    l.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {l.type === "income" ? "+" : "−"} {formatarReais(l.amount_cents)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
