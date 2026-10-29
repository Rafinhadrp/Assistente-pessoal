"use client";

import { useEffect, useState, useTransition } from "react";
import { apagarDeVez, esvaziarLixeira, restaurar } from "@/app/(app)/acoes";
import { useAviso } from "./ui/Aviso";
import { Confirmar } from "./ui/Folha";
import { IconeLixeira, IconeRestaurar } from "./ui/Icones";

export type ItemLixeira = {
  tabela: "transactions" | "appointments";
  id: string;
  titulo: string;
  detalhe: string;
  apagadoEm: string;
  dias: number;
};

export default function ListaLixeira({ itens }: { itens: ItemLixeira[] }) {
  const [escondidos, setEscondidos] = useState<Set<string>>(new Set());
  const [apagando, setApagando] = useState<ItemLixeira | null>(null);
  const [esvaziando, setEsvaziando] = useState(false);
  const [ocupado, iniciar] = useTransition();
  const aviso = useAviso();

  useEffect(() => setEscondidos(new Set()), [itens]);
  const visiveis = itens.filter((i) => !escondidos.has(i.id));
  const esconder = (id: string) => setEscondidos((s) => new Set(s).add(id));
  const mostrar = (id: string) =>
    setEscondidos((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-suave">
          {visiveis.length} {visiveis.length === 1 ? "item" : "itens"}
        </p>
        {visiveis.length > 0 && (
          <button type="button" onClick={() => setEsvaziando(true)} className="text-sm font-semibold text-gasto">
            Esvaziar lixeira
          </button>
        )}
      </div>

      <ul className="cartao divide-y divide-borda overflow-hidden">
        {visiveis.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium first-letter:uppercase">{item.titulo}</p>
              <p className="truncate text-xs text-suave">{item.detalhe}</p>
              <p className={`mt-0.5 text-xs font-medium ${item.dias <= 3 ? "text-gasto" : "text-aviso"}`}>
                {item.dias === 0
                  ? "Será apagado hoje"
                  : `Apagado de vez em ${item.dias} ${item.dias === 1 ? "dia" : "dias"}`}
              </p>
            </div>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => {
                esconder(item.id);
                iniciar(async () => {
                  const r = await restaurar(item.tabela, item.id);
                  if (r.ok) aviso.mostrar({ mensagem: "Restaurado" }, 2500);
                  else {
                    mostrar(item.id);
                    aviso.mostrar({ mensagem: r.erro });
                  }
                });
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-destaque-suave px-3 py-2 text-sm font-semibold text-destaque transition active:scale-95"
            >
              <IconeRestaurar className="h-4 w-4" /> Restaurar
            </button>
            <button
              type="button"
              aria-label="Apagar de vez"
              title="Apagar de vez"
              onClick={() => setApagando(item)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-suave transition hover:bg-gasto-suave hover:text-gasto"
            >
              <IconeLixeira className="h-[18px] w-[18px]" />
            </button>
          </li>
        ))}
      </ul>

      <Confirmar
        aberta={!!apagando}
        titulo="Apagar de vez?"
        mensagem={
          apagando && (
            <>
              <strong className="text-texto">{apagando.titulo}</strong> será apagado para sempre. Isso não pode ser
              desfeito.
            </>
          )
        }
        confirmar="Apagar de vez"
        perigoso
        ocupado={ocupado}
        aoCancelar={() => setApagando(null)}
        aoConfirmar={() => {
          const item = apagando!;
          setApagando(null);
          esconder(item.id);
          iniciar(async () => {
            const r = await apagarDeVez(item.tabela, item.id);
            if (!r.ok) {
              mostrar(item.id);
              aviso.mostrar({ mensagem: r.erro });
            }
          });
        }}
      />
      <Confirmar
        aberta={esvaziando}
        titulo="Esvaziar a lixeira?"
        mensagem="Todos os itens da lixeira serão apagados para sempre. Isso não pode ser desfeito."
        confirmar="Esvaziar"
        perigoso
        ocupado={ocupado}
        aoCancelar={() => setEsvaziando(false)}
        aoConfirmar={() => {
          setEsvaziando(false);
          iniciar(async () => {
            const r = await esvaziarLixeira();
            if (!r.ok) aviso.mostrar({ mensagem: r.erro });
          });
        }}
      />
      {aviso.elemento}
    </>
  );
}
