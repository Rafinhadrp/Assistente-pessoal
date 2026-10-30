"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { excluirConversa, listarConversas, type ResumoConversa } from "@/app/(app)/acoes";
import { dataSP, rotuloDoDia } from "@/lib/datas";
import { useAviso } from "./ui/Aviso";
import { Confirmar } from "./ui/Folha";
import { IconeFechar, IconeLixeira, IconeMenu, IconeNovaConversa } from "./ui/Icones";
import LinhaDeslizavel from "./ui/LinhaDeslizavel";

// Gaveta lateral com as conversas (como no app do Claude)
export default function ListaConversas({ atual }: { atual: string | null }) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [conversas, setConversas] = useState<ResumoConversa[] | null>(null);
  const [apagando, setApagando] = useState<ResumoConversa | null>(null);
  const [ocupado, iniciar] = useTransition();
  const aviso = useAviso();

  // Busca a lista sempre que abre (inclui conversas criadas agora há pouco)
  useEffect(() => {
    if (!aberta) return;
    listarConversas().then(setConversas);
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && setAberta(false);
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberta]);

  // A conversa aberta agora (pode ter sido criada sem recarregar a página)
  const [atualAgora, setAtualAgora] = useState(atual);
  useEffect(() => {
    const ler = () => setAtualAgora(new URLSearchParams(window.location.search).get("c") ?? atual);
    ler();
    window.addEventListener("conversa-criada", ler);
    return () => window.removeEventListener("conversa-criada", ler);
  }, [atual]);

  function abrir(id: string) {
    setAberta(false);
    router.push(`/?c=${id}`);
  }

  function novaConversa() {
    setAberta(false);
    router.push(`/?nova=${Date.now()}`);
  }

  function confirmarExclusao() {
    const item = apagando;
    if (!item) return;
    setApagando(null);
    setConversas((l) => l?.filter((c) => c.id !== item.id) ?? null);
    iniciar(async () => {
      const r = await excluirConversa(item.id);
      if (!r.ok) {
        aviso.mostrar({ mensagem: r.erro });
        listarConversas().then(setConversas);
        return;
      }
      aviso.mostrar({ mensagem: "Conversa excluída" }, 2500);
      if (item.id === atualAgora) novaConversa();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-label="Conversas"
        title="Conversas"
        className="-ml-1.5 grid h-10 w-10 place-items-center rounded-full text-suave transition hover:bg-superficie-2 hover:text-texto active:scale-95"
      >
        <IconeMenu className="h-[22px] w-[22px]" />
      </button>

      {aberta &&
        createPortal(
          <div className="fixed inset-0 z-50" role="dialog" aria-modal aria-label="Conversas">
            <div className="absolute inset-0 animate-surgir bg-black/35 backdrop-blur-[2px]" onClick={() => setAberta(false)} />
            <aside
              data-sem-puxar
              className="vidro-forte absolute inset-y-0 left-0 flex w-[min(86vw,22rem)] animate-[deslizar_280ms_cubic-bezier(0.2,0.8,0.2,1)] flex-col border-r pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
            >
              <div className="flex items-center justify-between px-4 pb-2 pt-4">
                <h2 className="text-xl font-bold tracking-tight">Conversas</h2>
                <button
                  type="button"
                  onClick={() => setAberta(false)}
                  aria-label="Fechar"
                  className="grid h-9 w-9 place-items-center rounded-full text-suave hover:bg-superficie-2"
                >
                  <IconeFechar />
                </button>
              </div>

              <div className="px-3 pb-3">
                <button type="button" onClick={novaConversa} className="botao-primario w-full">
                  <IconeNovaConversa className="h-5 w-5" /> Nova conversa
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 pb-4">
                {conversas === null ? (
                  <p className="px-2 py-6 text-center text-sm text-suave">Carregando…</p>
                ) : conversas.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-suave">Nenhuma conversa ainda.</p>
                ) : (
                  <ul className="space-y-1">
                    {conversas.map((c) => {
                      const ativa = c.id === atualAgora;
                      return (
                        <li key={c.id} className="overflow-hidden rounded-2xl">
                          <LinhaDeslizavel aoAbrir={() => abrir(c.id)} aoApagar={() => setApagando(c)}>
                            <div
                              className={`flex items-center gap-2 py-2.5 pl-3.5 pr-1.5 ${
                                ativa ? "aba-ativa rounded-2xl" : ""
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className={`truncate text-[15px] ${ativa ? "font-semibold" : "font-medium"}`}>{c.title}</p>
                                <p className="text-xs text-suave">{rotuloDoDia(dataSP(new Date(c.updated_at)))}</p>
                              </div>
                              <button
                                type="button"
                                aria-label={`Excluir conversa ${c.title}`}
                                title="Excluir conversa"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setApagando(c);
                                }}
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-suave/70 transition hover:bg-gasto-suave hover:text-gasto"
                              >
                                <IconeLixeira className="h-[18px] w-[18px]" />
                              </button>
                            </div>
                          </LinhaDeslizavel>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <p className="px-4 pb-3 text-center text-[11px] text-suave/80">
                Excluir uma conversa não apaga nada da Agenda nem de Finanças.
              </p>
            </aside>
          </div>,
          document.body,
        )}

      <Confirmar
        aberta={!!apagando}
        titulo="Excluir conversa?"
        mensagem={
          apagando && (
            <>
              As mensagens de <strong className="text-texto">“{apagando.title}”</strong> serão apagadas. Tudo o que
              você registrou em <strong className="text-texto">Finanças</strong> e na{" "}
              <strong className="text-texto">Agenda</strong> continua salvo.
            </>
          )
        }
        confirmar="Excluir conversa"
        perigoso
        ocupado={ocupado}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setApagando(null)}
      />
      {aviso.elemento}
    </>
  );
}

// Link simples para começar uma conversa nova (usado no cabeçalho)
export function LinkNovaConversa() {
  const [href, setHref] = useState("/?nova=1");
  useEffect(() => setHref(`/?nova=${Date.now()}`), []);
  return (
    <Link
      href={href}
      onClick={() => setHref(`/?nova=${Date.now()}`)}
      aria-label="Nova conversa"
      title="Nova conversa"
      className="grid h-10 w-10 place-items-center rounded-full text-suave transition hover:bg-superficie-2 hover:text-texto active:scale-95"
    >
      <IconeNovaConversa className="h-[22px] w-[22px]" />
    </Link>
  );
}
