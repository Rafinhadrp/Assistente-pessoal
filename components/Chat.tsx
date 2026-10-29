"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Humor } from "@/lib/humor";
import Mascote from "./Mascote";
import { IconeEnviar, IconeFechar, IconeMicrofone } from "./ui/Icones";
import { useReconhecimentoVoz } from "./useReconhecimentoVoz";

export type MensagemChat = {
  id: string;
  role: "user" | "assistant";
  content: string;
  humor?: Humor;
  // Quantas buscas na internet a resposta usou (custo extra) e de onde veio a informação
  buscas?: number;
  fontes?: { url: string; titulo: string }[];
};

const SUGESTOES = ["Gastei 35 no mercado", "Quanto ainda tenho?", "Tenho médico dia 5 às 14h", "O que tenho essa semana?"];

export default function Chat({ historico, saudacao }: { historico: MensagemChat[]; saudacao: string }) {
  const [mensagens, setMensagens] = useState<MensagemChat[]>(historico);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  // Texto que já estava no campo quando o microfone foi ligado
  const textoAntesDaVoz = useRef("");

  const voz = useReconhecimentoVoz({
    aoOuvirParcial: (falado) => setTexto(juntar(textoAntesDaVoz.current, falado)),
    // Só coloca o texto no campo; a pessoa confere e toca em enviar
    aoTerminar: (falado) => setTexto(juntar(textoAntesDaVoz.current, falado)),
  });

  function alternarMicrofone() {
    if (voz.ouvindo) {
      voz.parar();
    } else {
      textoAntesDaVoz.current = texto;
      voz.comecar();
    }
  }

  function cancelarVoz() {
    voz.cancelar();
    setTexto(textoAntesDaVoz.current);
  }

  const ultimaResposta = mensagens.findLastIndex((m) => m.role === "assistant");

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens, enviando]);

  // O campo cresce conforme o texto (até umas 5 linhas)
  useLayoutEffect(() => {
    const el = campo.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [texto]);

  async function enviar(conteudo: string) {
    const mensagem = conteudo.trim();
    if (!mensagem || enviando) return;

    setTexto("");
    setEnviando(true);
    setMensagens((m) => [...m, { id: crypto.randomUUID(), role: "user", content: mensagem }]);

    let resposta: string;
    let humor: Humor = "erro";
    let buscas: number | undefined;
    let fontes: MensagemChat["fontes"];
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem }),
      });
      const json = await r.json().catch(() => ({}));
      if (r.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (json.resposta) {
        resposta = json.resposta;
        humor = json.humor ?? "feliz";
        buscas = json.buscas ?? 0;
        fontes = json.fontes ?? [];
      } else {
        resposta = json.erro ?? "Algo deu errado.";
      }
    } catch {
      resposta = "Sem conexão. Verifique sua internet e tente de novo.";
      humor = "tonto";
    }

    setMensagens((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "assistant", content: resposta, humor, buscas, fontes },
    ]);
    setEnviando(false);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-4 px-4 pb-6 pt-4">
        {mensagens.length === 0 && (
          <div className="flex animate-entrar flex-col items-center pt-10 text-center">
            <Mascote humor="acenando" tamanho={128} />
            <h2 className="mt-3 text-2xl font-bold tracking-tight">{saudacao}</h2>
            <p className="mt-1 max-w-xs text-suave">
              Me conte um gasto, uma receita ou um compromisso. Pode escrever ou falar, do seu jeito.
            </p>
            <div className="mt-6 flex max-w-sm flex-wrap justify-center gap-2">
              {SUGESTOES.map((s) => (
                <button key={s} onClick={() => enviar(s)} className="chip hover:border-destaque/40">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensagens.map((m, i) =>
          m.role === "user" ? (
            <div key={m.id} className="flex animate-entrar justify-end pl-12">
              <div className="whitespace-pre-wrap rounded-[22px] rounded-br-md bg-botao px-4 py-2.5 leading-relaxed text-white shadow-[0_6px_20px_-10px_var(--botao)]">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex animate-entrar items-end gap-2 pr-8">
              <Mascote
                humor={m.humor ?? "feliz"}
                tamanho={44}
                // Só a última resposta fica animada; as antigas ficam paradas (mais leve)
                animado={i === ultimaResposta}
                className="-mb-1 -ml-1.5 shrink-0"
              />
              <div className="min-w-0">
                <div className="vidro whitespace-pre-wrap rounded-[22px] rounded-bl-md px-4 py-2.5 leading-relaxed">
                  {m.content}
                </div>
                <SeloCusto buscas={m.buscas} fontes={m.fontes} />
              </div>
            </div>
          ),
        )}

        {enviando && (
          <div className="flex animate-entrar items-end gap-2">
            <Mascote humor="pensando" tamanho={44} className="-mb-1 -ml-1.5 shrink-0" />
            <div className="vidro rounded-[22px] rounded-bl-md px-4 py-3.5">
              <span className="inline-flex gap-1.5" aria-label="Pensando">
                <span className="h-2 w-2 animate-bounce rounded-full bg-suave/60 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-suave/60 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-suave/60" />
              </span>
            </div>
          </div>
        )}
        <div ref={fim} />
      </div>

      {/* Barra de escrever: uma "pílula" de vidro flutuando acima da navegação */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Enviar enquanto ouve: para de ouvir e manda o que já está no campo
          if (voz.ouvindo) voz.cancelar();
          enviar(texto);
        }}
        className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 px-3 pb-3"
      >
        {voz.erro && (
          <div className="vidro mb-2 flex animate-entrar items-start gap-2 rounded-2xl px-3.5 py-2.5 text-sm">
            <p className="flex-1 text-aviso">{voz.erro}</p>
            <button type="button" onClick={voz.limparErro} aria-label="Fechar aviso" className="text-suave">
              <IconeFechar className="h-4 w-4" />
            </button>
          </div>
        )}
        {voz.ouvindo && (
          <div className="mb-2 flex animate-entrar items-center justify-between px-2 text-sm">
            <span className="flex items-center gap-2 font-medium text-gasto">
              <Mascote humor="espiando" tamanho={28} />
              Ouvindo… toque em ■ quando terminar
            </span>
            <button type="button" onClick={cancelarVoz} className="font-medium text-suave underline-offset-2 hover:underline">
              Cancelar
            </button>
          </div>
        )}
        <div
          className={`vidro-forte flex items-end gap-1.5 rounded-[26px] border p-1.5 shadow-[var(--sombra)] transition ${
            voz.ouvindo ? "border-gasto/40 ring-4 ring-gasto/10" : "focus-within:border-destaque/40 focus-within:ring-4 focus-within:ring-destaque/10"
          }`}
        >
          <textarea
            ref={campo}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar(texto);
              }
            }}
            rows={1}
            readOnly={voz.ouvindo}
            placeholder={voz.ouvindo ? "Pode falar..." : "Escreva ou fale…"}
            className="max-h-36 min-h-11 flex-1 resize-none bg-transparent px-3.5 py-2.5 leading-6 outline-none placeholder:text-suave/70"
          />
          <button
            type="button"
            onClick={alternarMicrofone}
            disabled={enviando}
            aria-label={voz.ouvindo ? "Parar de ouvir" : "Falar"}
            aria-pressed={voz.ouvindo}
            className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full transition active:scale-95 disabled:opacity-40 ${
              voz.ouvindo ? "bg-gasto text-white" : "text-suave hover:bg-superficie-2 hover:text-texto"
            } ${voz.suportado ? "" : "opacity-60"}`}
          >
            {voz.ouvindo && <span className="absolute inset-0 animate-ping rounded-full bg-gasto/30" />}
            {voz.ouvindo ? (
              <svg viewBox="0 0 24 24" className="relative h-4 w-4" fill="currentColor" aria-hidden>
                <rect x="5" y="5" width="14" height="14" rx="3" />
              </svg>
            ) : (
              <IconeMicrofone className="h-[22px] w-[22px]" />
            )}
          </button>
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            aria-label="Enviar"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-botao text-white transition hover:bg-botao-hover active:scale-95 disabled:bg-superficie-2 disabled:text-suave/60"
          >
            <IconeEnviar className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

// Selo embaixo de cada resposta: mostra se ela pesquisou na internet (custo extra) ou não
function SeloCusto({ buscas, fontes }: { buscas?: number; fontes?: MensagemChat["fontes"] }) {
  const [aberto, setAberto] = useState(false);
  if (buscas === undefined) return null; // mensagens de erro do próprio app
  if (buscas === 0) {
    return (
      <p className="mt-1 pl-2 text-[11px] text-suave/70" title="Resposta normal, sem custo extra">
        ✓ sem busca
      </p>
    );
  }
  return (
    <div className="mt-1 pl-1">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        title="Esta resposta pesquisou na internet (tem custo extra)"
        className="inline-flex items-center gap-1 rounded-full bg-aviso-suave px-2 py-0.5 text-[11px] font-medium text-aviso transition active:scale-95"
      >
        🌐 pesquisou na internet · {buscas} {buscas === 1 ? "busca" : "buscas"}
        {fontes && fontes.length > 0 && <span aria-hidden>{aberto ? "▴" : "▾"}</span>}
      </button>
      {aberto && fontes && fontes.length > 0 && (
        <ul className="vidro mt-1.5 animate-entrar space-y-1 rounded-2xl px-3 py-2 text-xs">
          {fontes.map((f) => (
            <li key={f.url} className="truncate">
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-destaque underline-offset-2 hover:underline">
                {f.titulo || new URL(f.url).hostname}
              </a>
              <span className="text-suave"> · {new URL(f.url).hostname.replace(/^www\./, "")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Junta o que já estava digitado com o que foi falado
function juntar(antes: string, falado: string) {
  return [antes.trim(), falado.trim()].filter(Boolean).join(" ");
}
