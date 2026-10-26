"use client";

import { useEffect, useRef, useState } from "react";
import { useReconhecimentoVoz } from "./useReconhecimentoVoz";

export type MensagemChat = { id: string; role: "user" | "assistant"; content: string };

const SUGESTOES = ["Gastei 35 no mercado", "Quanto ainda tenho?", "Tenho médico dia 5 às 14h"];

export default function Chat({ historico }: { historico: MensagemChat[] }) {
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

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens, enviando]);

  async function enviar(conteudo: string) {
    const mensagem = conteudo.trim();
    if (!mensagem || enviando) return;

    setTexto("");
    setEnviando(true);
    setMensagens((m) => [...m, { id: crypto.randomUUID(), role: "user", content: mensagem }]);

    let resposta: string;
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
      resposta = json.resposta ?? `⚠️ ${json.erro ?? "Algo deu errado."}`;
    } catch {
      resposta = "⚠️ Sem conexão. Verifique sua internet e tente de novo.";
    }

    setMensagens((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: resposta }]);
    setEnviando(false);
    campo.current?.focus();
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-3 px-4 py-4">
        {mensagens.length === 0 && (
          <div className="mt-10 text-center text-slate-500 dark:text-slate-400">
            <p className="mb-4">Olá! Me conte um gasto, uma receita ou um compromisso.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensagens.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-md bg-indigo-600 text-white"
                  : "rounded-bl-md bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {enviando && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
              </span>
            </div>
          </div>
        )}
        <div ref={fim} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Enviar enquanto ouve: para de ouvir e manda o que já está no campo
          if (voz.ouvindo) voz.cancelar();
          enviar(texto);
        }}
        className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] border-t border-slate-200 bg-slate-50/95 px-3 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
      >
        {voz.erro && (
          <div className="mb-2 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <p className="flex-1">{voz.erro}</p>
            <button type="button" onClick={voz.limparErro} aria-label="Fechar aviso" className="font-semibold">
              ✕
            </button>
          </div>
        )}
        {voz.ouvindo && (
          <div className="mb-2 flex items-center justify-between text-sm text-rose-600 dark:text-rose-400">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
              Ouvindo… toque em ■ quando terminar
            </span>
            <button type="button" onClick={cancelarVoz} className="text-slate-500 underline dark:text-slate-400">
              Cancelar
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
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
            placeholder={voz.ouvindo ? "Ouvindo..." : "Escreva ou toque no microfone"}
            className="max-h-32 flex-1 resize-none rounded-2xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={alternarMicrofone}
            disabled={enviando}
            aria-label={voz.ouvindo ? "Parar de ouvir" : "Falar"}
            aria-pressed={voz.ouvindo}
            className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full transition disabled:opacity-40 ${
              voz.ouvindo
                ? "bg-rose-600 text-white"
                : "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
            } ${voz.suportado ? "" : "opacity-60"}`}
          >
            {voz.ouvindo && <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/40" />}
            {voz.ouvindo ? (
              <svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="currentColor" aria-hidden>
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            )}
          </button>
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            aria-label="Enviar"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

// Junta o que já estava digitado com o que foi falado
function juntar(antes: string, falado: string) {
  return [antes.trim(), falado.trim()].filter(Boolean).join(" ");
}
