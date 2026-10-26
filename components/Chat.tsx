"use client";

import { useEffect, useRef, useState } from "react";

export type MensagemChat = { id: string; role: "user" | "assistant"; content: string };

const SUGESTOES = ["Gastei 35 no mercado", "Quanto ainda tenho?", "Tenho médico dia 5 às 14h"];

export default function Chat({ historico }: { historico: MensagemChat[] }) {
  const [mensagens, setMensagens] = useState<MensagemChat[]>(historico);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

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
          enviar(texto);
        }}
        className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] flex items-end gap-2 border-t border-slate-200 bg-slate-50/95 px-3 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
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
          placeholder="Escreva uma mensagem..."
          className="max-h-32 flex-1 resize-none rounded-2xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900"
        />
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
      </form>
    </div>
  );
}
