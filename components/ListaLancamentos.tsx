"use client";

import { useEffect, useState, useTransition } from "react";
import { editarLancamento, moverParaLixeira, restaurar } from "@/app/(app)/acoes";
import { emojiCategoria } from "@/lib/categorias";
import { rotuloDoDia } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { useAviso } from "./ui/Aviso";
import Folha, { Confirmar } from "./ui/Folha";
import { IconeLapis, IconeLixeira } from "./ui/Icones";
import LinhaDeslizavel from "./ui/LinhaDeslizavel";

export type Lancamento = {
  id: string;
  type: "income" | "expense";
  amount_cents: number;
  category: string;
  description: string;
  date: string;
  edited_at: string | null;
};

export default function ListaLancamentos({
  lancamentos,
  categorias,
}: {
  lancamentos: Lancamento[];
  categorias: string[];
}) {
  const [escondidos, setEscondidos] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<Lancamento | null>(null);
  const [apagando, setApagando] = useState<Lancamento | null>(null);
  const [ocupado, iniciar] = useTransition();
  const aviso = useAviso();

  // Quando a lista vem atualizada do servidor, some com os escondidos que já saíram
  useEffect(() => setEscondidos(new Set()), [lancamentos]);

  const visiveis = lancamentos.filter((l) => !escondidos.has(l.id));
  const porDia = new Map<string, Lancamento[]>();
  for (const l of visiveis) porDia.set(l.date, [...(porDia.get(l.date) ?? []), l]);

  function confirmarApagar() {
    const item = apagando;
    if (!item) return;
    setApagando(null);
    setEditando(null);
    setEscondidos((s) => new Set(s).add(item.id));
    iniciar(async () => {
      const r = await moverParaLixeira("transactions", item.id);
      if (!r.ok) {
        setEscondidos((s) => {
          const n = new Set(s);
          n.delete(item.id);
          return n;
        });
        aviso.mostrar({ mensagem: r.erro });
        return;
      }
      aviso.mostrar({
        mensagem: "Movido para a lixeira",
        acao: { rotulo: "Desfazer", fazer: () => iniciar(async () => void (await restaurar("transactions", item.id))) },
      });
    });
  }

  if (visiveis.length === 0) return <>{aviso.elemento}</>;

  return (
    <>
      <div className="space-y-5">
        {[...porDia.entries()].map(([dia, itens], g) => (
          <section key={dia} className="animate-entrar" style={{ animationDelay: `${Math.min(g, 6) * 40}ms` }}>
            <h3 className="mb-2 px-1 text-[13px] font-semibold text-suave">{rotuloDoDia(dia)}</h3>
            <ul className="cartao divide-y divide-borda overflow-hidden">
              {itens.map((l) => (
                <li key={l.id}>
                  <LinhaDeslizavel aoAbrir={() => setEditando(l)} aoApagar={() => setApagando(l)}>
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-lg ${
                          l.type === "income" ? "bg-receita-suave" : "bg-superficie-2"
                        }`}
                        aria-hidden
                      >
                        {emojiCategoria(l.category)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium first-letter:uppercase">{l.description || l.category}</p>
                        <p className="flex items-center gap-1.5 truncate text-xs text-suave">
                          <span className="capitalize">{l.category}</span>
                          {l.edited_at && (
                            <>
                              <span aria-hidden>·</span>
                              <span className="inline-flex items-center gap-0.5 text-destaque">
                                <IconeLapis className="h-3 w-3" /> editado por você
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <p
                        className={`numeros shrink-0 font-semibold ${l.type === "income" ? "text-receita" : "text-texto"}`}
                      >
                        {l.type === "income" ? "+ " : "− "}
                        {formatarReais(l.amount_cents)}
                      </p>
                    </div>
                  </LinhaDeslizavel>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="px-1 text-center text-xs text-suave/80">Toque para editar · arraste para o lado para apagar</p>
      </div>

      {editando && (
        <EditorLancamento
          lancamento={editando}
          categorias={categorias}
          aoFechar={() => setEditando(null)}
          aoApagar={() => setApagando(editando)}
          aoSalvar={() => {
            setEditando(null);
            aviso.mostrar({ mensagem: "Alterações salvas" }, 2500);
          }}
        />
      )}

      <Confirmar
        aberta={!!apagando}
        titulo="Mover para a lixeira?"
        mensagem={
          apagando && (
            <>
              <strong className="text-texto">
                {apagando.description || apagando.category} · {formatarReais(apagando.amount_cents)}
              </strong>{" "}
              vai para a lixeira e sai do seu saldo. Você pode restaurar em até 30 dias; depois disso ele é
              apagado de vez.
            </>
          )
        }
        confirmar="Mover para a lixeira"
        perigoso
        ocupado={ocupado}
        aoConfirmar={confirmarApagar}
        aoCancelar={() => setApagando(null)}
      />
      {aviso.elemento}
    </>
  );
}

function EditorLancamento({
  lancamento,
  categorias,
  aoFechar,
  aoApagar,
  aoSalvar,
}: {
  lancamento: Lancamento;
  categorias: string[];
  aoFechar: () => void;
  aoApagar: () => void;
  aoSalvar: () => void;
}) {
  const [tipo, setTipo] = useState(lancamento.type);
  const [valor, setValor] = useState((lancamento.amount_cents / 100).toFixed(2).replace(".", ","));
  const [descricao, setDescricao] = useState(lancamento.description);
  const [categoria, setCategoria] = useState(lancamento.category);
  const [data, setData] = useState(lancamento.date);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  return (
    <Folha aberta aoFechar={aoFechar} titulo="Editar lançamento">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setErro(null);
          iniciar(async () => {
            const r = await editarLancamento(lancamento.id, { tipo, valor, descricao, categoria, data });
            if (r.ok) aoSalvar();
            else setErro(r.erro);
          });
        }}
      >
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-superficie-2 p-1">
          {(
            [
              ["expense", "Gasto"],
              ["income", "Receita"],
            ] as const
          ).map(([v, nome]) => (
            <button
              key={v}
              type="button"
              onClick={() => setTipo(v)}
              className={`rounded-xl py-2 text-sm font-semibold transition ${
                tipo === v ? `bg-superficie-forte shadow-sm ${v === "income" ? "text-receita" : "text-gasto"}` : "text-suave"
              }`}
            >
              {nome}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="rotulo">Valor</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-suave">R$</span>
            <input
              className="campo numeros pl-11 text-lg font-semibold"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />
          </div>
        </label>

        <label className="block">
          <span className="rotulo">Descrição</span>
          <input className="campo" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="rotulo">Categoria</span>
            <input
              className="campo"
              list="categorias-lancamento"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            />
            <datalist id="categorias-lancamento">
              {categorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="rotulo">Data</span>
            <input className="campo" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </label>
        </div>

        {erro && <p className="rounded-xl bg-gasto-suave px-3 py-2 text-sm text-gasto">{erro}</p>}

        <button type="submit" disabled={salvando} className="botao-primario w-full">
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={aoApagar}
          className="flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-gasto"
        >
          <IconeLixeira className="h-4 w-4" /> Mover para a lixeira
        </button>
      </form>
    </Folha>
  );
}
