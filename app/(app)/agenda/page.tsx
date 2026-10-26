import Link from "next/link";
import { formatarDataHora, hojeSP, inicioDoDiaISO } from "@/lib/datas";
import { criarClienteServidor } from "@/lib/supabase/server";

type Compromisso = {
  id: string;
  title: string;
  category: "saude" | "pessoal" | "trabalho" | "outros";
  starts_at: string;
  status: "pending" | "done" | "archived";
  notes: string | null;
};

const CATEGORIAS: { chave: Compromisso["category"]; nome: string; icone: string }[] = [
  { chave: "saude", nome: "Saúde", icone: "🩺" },
  { chave: "trabalho", nome: "Trabalho", icone: "💼" },
  { chave: "pessoal", nome: "Pessoal", icone: "🙂" },
  { chave: "outros", nome: "Outros", icone: "📌" },
];

const STATUS: Record<Compromisso["status"], string> = {
  pending: "Pendente",
  done: "Feito",
  archived: "Arquivado",
};

function Cartao({ c }: { c: Compromisso }) {
  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{c.title}</p>
        {c.status !== "pending" && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {STATUS[c.status]}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{formatarDataHora(c.starts_at)}</p>
      {c.notes && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c.notes}</p>}
    </li>
  );
}

export default async function PaginaAgenda({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams;
  const historico = aba === "historico";
  const inicioDeHoje = inicioDoDiaISO(hojeSP());

  const supabase = await criarClienteServidor();
  const consulta = historico
    ? supabase
        .from("appointments")
        .select("id, title, category, starts_at, status, notes")
        .or(`status.neq.pending,starts_at.lt.${inicioDeHoje}`)
        .order("starts_at", { ascending: false })
        .limit(100)
    : supabase
        .from("appointments")
        .select("id, title, category, starts_at, status, notes")
        .eq("status", "pending")
        .gte("starts_at", inicioDeHoje)
        .order("starts_at", { ascending: true });
  const { data } = await consulta;
  const compromissos = (data ?? []) as Compromisso[];

  const aba_ = (ativa: boolean) =>
    `flex-1 rounded-lg py-2 text-center text-sm font-medium transition ${
      ativa ? "bg-white shadow-sm dark:bg-slate-700" : "text-slate-500 dark:text-slate-400"
    }`;

  return (
    <main className="space-y-5 px-4 pb-6 pt-[calc(1rem+env(safe-area-inset-top))]">
      <h1 className="text-lg font-semibold">Agenda</h1>

      <div className="flex gap-1 rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
        <Link href="/agenda" className={aba_(!historico)}>
          Próximos
        </Link>
        <Link href="/agenda?aba=historico" className={aba_(historico)}>
          Histórico
        </Link>
      </div>

      {compromissos.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
          {historico
            ? "Nada no histórico ainda."
            : "Nenhum compromisso pendente. Conte no chat: “tenho médico dia 5 às 14h”."}
        </p>
      ) : historico ? (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
          {compromissos.map((c) => (
            <Cartao key={c.id} c={c} />
          ))}
        </ul>
      ) : (
        CATEGORIAS.map(({ chave, nome, icone }) => {
          const daCategoria = compromissos.filter((c) => c.category === chave);
          if (daCategoria.length === 0) return null;
          return (
            <section key={chave}>
              <h2 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                {icone} {nome}
              </h2>
              <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
                {daCategoria.map((c) => (
                  <Cartao key={c.id} c={c} />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </main>
  );
}
