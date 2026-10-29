"use client";

import { useEffect, useState, useTransition } from "react";
import { editarCompromisso, moverParaLixeira, restaurar } from "@/app/(app)/acoes";
import { AGENDA, type CategoriaAgenda } from "@/lib/categorias";
import { dataSP, horaSP, paraHoraLocal, rotuloDoDia } from "@/lib/datas";
import { useAviso } from "./ui/Aviso";
import Folha, { Confirmar } from "./ui/Folha";
import { IconeLapis, IconeLixeira, IconeRelogio } from "./ui/Icones";
import LinhaDeslizavel from "./ui/LinhaDeslizavel";

export type Compromisso = {
  id: string;
  title: string;
  category: CategoriaAgenda;
  starts_at: string;
  status: "pending" | "done" | "archived";
  notes: string | null;
  edited_at: string | null;
};

const STATUS: Record<Compromisso["status"], string> = {
  pending: "Pendente",
  done: "Feito",
  archived: "Arquivado",
};

export default function ListaCompromissos({
  compromissos,
  agruparPorCategoria,
}: {
  compromissos: Compromisso[];
  agruparPorCategoria: boolean;
}) {
  const [escondidos, setEscondidos] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<Compromisso | null>(null);
  const [apagando, setApagando] = useState<Compromisso | null>(null);
  const [ocupado, iniciar] = useTransition();
  const aviso = useAviso();

  useEffect(() => setEscondidos(new Set()), [compromissos]);

  const visiveis = compromissos.filter((c) => !escondidos.has(c.id));
  const grupos: { chave: string; titulo: string; itens: Compromisso[] }[] = agruparPorCategoria
    ? (Object.keys(AGENDA) as CategoriaAgenda[])
        .map((cat) => ({
          chave: cat,
          titulo: `${AGENDA[cat].emoji}  ${AGENDA[cat].nome}`,
          itens: visiveis.filter((c) => c.category === cat),
        }))
        .filter((g) => g.itens.length > 0)
    : [{ chave: "todos", titulo: "", itens: visiveis }];

  function confirmarApagar() {
    const item = apagando;
    if (!item) return;
    setApagando(null);
    setEditando(null);
    setEscondidos((s) => new Set(s).add(item.id));
    iniciar(async () => {
      const r = await moverParaLixeira("appointments", item.id);
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
        acao: { rotulo: "Desfazer", fazer: () => iniciar(async () => void (await restaurar("appointments", item.id))) },
      });
    });
  }

  if (visiveis.length === 0) return <>{aviso.elemento}</>;

  return (
    <>
      <div className="space-y-5">
        {grupos.map((g, i) => (
          <section key={g.chave} className="animate-entrar" style={{ animationDelay: `${i * 50}ms` }}>
            {g.titulo && <h3 className="mb-2 px-1 text-[13px] font-semibold text-suave">{g.titulo}</h3>}
            <ul className="cartao divide-y divide-borda overflow-hidden">
              {g.itens.map((c) => (
                <li key={c.id}>
                  <LinhaDeslizavel aoAbrir={() => setEditando(c)} aoApagar={() => setApagando(c)}>
                    <Linha c={c} />
                  </LinhaDeslizavel>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="px-1 text-center text-xs text-suave/80">Toque para editar · arraste para o lado para apagar</p>
      </div>

      {editando && (
        <EditorCompromisso
          compromisso={editando}
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
              <strong className="text-texto">{apagando.title}</strong> vai para a lixeira. Você pode restaurar em até
              30 dias; depois disso ele é apagado de vez.
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

function Linha({ c }: { c: Compromisso }) {
  const cat = AGENDA[c.category] ?? AGENDA.outros;
  const d = new Date(c.starts_at);
  const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit" }).format(d);
  const mes = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", month: "short" })
    .format(d)
    .replace(".", "");
  const concluido = c.status !== "pending";

  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5">
      {/* Bloquinho de data com a cor da categoria */}
      <div
        className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl leading-none"
        style={{ background: `color-mix(in srgb, ${cat.cor} 14%, transparent)`, color: cat.cor }}
      >
        <span className="text-lg font-bold">{dia}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide">{mes}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate font-medium ${concluido ? "text-suave line-through decoration-suave/40" : ""}`}>
            {c.title}
          </p>
          {c.status !== "pending" && (
            <span className="shrink-0 rounded-full bg-superficie-2 px-2 py-0.5 text-[11px] font-medium text-suave">
              {STATUS[c.status]}
            </span>
          )}
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-suave">
          <IconeRelogio className="h-3.5 w-3.5" />
          {rotuloDoDia(dataSP(d))} · {horaSP(c.starts_at)}
          {c.edited_at && (
            <span className="inline-flex items-center gap-0.5 text-destaque">
              <span aria-hidden className="text-suave">·</span>
              <IconeLapis className="h-3 w-3" /> editado por você
            </span>
          )}
        </p>
        {c.notes && <p className="mt-1 line-clamp-2 text-sm text-suave">{c.notes}</p>}
      </div>
    </div>
  );
}

function EditorCompromisso({
  compromisso,
  aoFechar,
  aoApagar,
  aoSalvar,
}: {
  compromisso: Compromisso;
  aoFechar: () => void;
  aoApagar: () => void;
  aoSalvar: () => void;
}) {
  const [titulo, setTitulo] = useState(compromisso.title);
  const [dataHora, setDataHora] = useState(paraHoraLocal(compromisso.starts_at));
  const [categoria, setCategoria] = useState<CategoriaAgenda>(compromisso.category);
  const [status, setStatus] = useState(compromisso.status);
  const [notas, setNotas] = useState(compromisso.notes ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  return (
    <Folha aberta aoFechar={aoFechar} titulo="Editar compromisso">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setErro(null);
          iniciar(async () => {
            const r = await editarCompromisso(compromisso.id, { titulo, dataHora, categoria, status, notas });
            if (r.ok) aoSalvar();
            else setErro(r.erro);
          });
        }}
      >
        <label className="block">
          <span className="rotulo">Título</span>
          <input className="campo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
        </label>

        <label className="block">
          <span className="rotulo">Data e hora</span>
          <input
            className="campo"
            type="datetime-local"
            value={dataHora}
            onChange={(e) => setDataHora(e.target.value)}
            required
          />
        </label>

        <div>
          <span className="rotulo">Categoria</span>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(AGENDA) as CategoriaAgenda[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setCategoria(k)}
                className={`flex flex-col items-center gap-0.5 rounded-2xl border py-2 text-xs font-medium transition ${
                  categoria === k ? "border-transparent text-texto" : "border-borda text-suave"
                }`}
                style={
                  categoria === k
                    ? { background: `color-mix(in srgb, ${AGENDA[k].cor} 16%, transparent)` }
                    : undefined
                }
              >
                <span className="text-lg">{AGENDA[k].emoji}</span>
                {AGENDA[k].nome}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="rotulo">Situação</span>
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-superficie-2 p-1">
            {(Object.keys(STATUS) as Compromisso["status"][]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-xl py-2 text-sm font-semibold transition ${
                  status === s ? "bg-superficie-forte text-texto shadow-sm" : "text-suave"
                }`}
              >
                {STATUS[s]}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="rotulo">Notas</span>
          <textarea
            className="campo min-h-20 resize-none"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ex: levar exames, endereço..."
          />
        </label>

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
