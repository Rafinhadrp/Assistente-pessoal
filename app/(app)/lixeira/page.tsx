import AvisoBanco, { bancoDesatualizado } from "@/components/AvisoBanco";
import ListaLixeira, { type ItemLixeira } from "@/components/ListaLixeira";
import Mascote from "@/components/Mascote";
import BotaoVoltar from "@/components/ui/BotaoVoltar";
import Cabecalho from "@/components/ui/Cabecalho";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { criarClienteServidor } from "@/lib/supabase/server";

const DIA = 24 * 60 * 60 * 1000;

export default async function PaginaLixeira() {
  const supabase = await criarClienteServidor();
  await supabase.rpc("limpar_lixeira"); // apaga de vez o que está lá há mais de 30 dias

  const [lancamentos, compromissos] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, type, amount_cents, description, category, date, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
    supabase
      .from("appointments")
      .select("id, title, starts_at, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
  ]);

  const diasRestantes = (quando: string) => Math.max(0, 30 - Math.floor((Date.now() - Date.parse(quando)) / DIA));
  const itens: ItemLixeira[] = [
    ...(lancamentos.data ?? []).map((l) => ({
      tabela: "transactions" as const,
      id: l.id,
      titulo: l.description || l.category,
      detalhe: `${l.type === "income" ? "Receita" : "Gasto"} de ${formatarReais(l.amount_cents)} · ${formatarData(l.date)}`,
      apagadoEm: l.deleted_at as string,
      dias: diasRestantes(l.deleted_at as string),
    })),
    ...(compromissos.data ?? []).map((c) => ({
      tabela: "appointments" as const,
      id: c.id,
      titulo: c.title,
      detalhe: `Compromisso · ${formatarDataHora(c.starts_at)}`,
      apagadoEm: c.deleted_at as string,
      dias: diasRestantes(c.deleted_at as string),
    })),
  ].sort((a, b) => b.apagadoEm.localeCompare(a.apagadoEm));

  return (
    <>
      <Cabecalho
        titulo="Lixeira"
        subtitulo="Itens ficam aqui por 30 dias"
        icone={<BotaoVoltar />}
      />
      <main className="space-y-4 px-4 pb-8 pt-4">
        {bancoDesatualizado(lancamentos.error) ? (
          <AvisoBanco />
        ) : itens.length === 0 ? (
          <div className="cartao animate-entrar p-8 text-center">
            <Mascote humor="estiloso" tamanho={88} className="mx-auto" />
            <p className="mt-2 font-semibold">Lixeira vazia</p>
            <p className="mt-1 text-sm text-suave">
              Quando você apagar algo em Finanças ou Agenda, ele fica aqui por 30 dias antes de sumir de vez.
            </p>
          </div>
        ) : (
          <ListaLixeira itens={itens} />
        )}
      </main>
    </>
  );
}
