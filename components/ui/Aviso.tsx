"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Estado = { mensagem: string; acao?: { rotulo: string; fazer: () => void } } | null;

// Aviso rápido no rodapé (ex: "Movido para a lixeira · Desfazer")
export function useAviso() {
  const [aviso, setAviso] = useState<Estado>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrar = useCallback((novo: NonNullable<Estado>, ms = 5000) => {
    if (timer.current) clearTimeout(timer.current);
    setAviso(novo);
    timer.current = setTimeout(() => setAviso(null), ms);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const conteudo = aviso ? (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto flex animate-entrar items-center gap-4 vidro-forte rounded-full border px-5 py-3 text-sm text-texto shadow-xl"
      >
        <span>{aviso.mensagem}</span>
        {aviso.acao && (
          <button
            type="button"
            onClick={() => {
              aviso.acao!.fazer();
              setAviso(null);
            }}
            className="font-semibold text-destaque"
          >
            {aviso.acao.rotulo}
          </button>
        )}
      </div>
    </div>
  ) : null;
  // Desenhado no <body> para nunca ficar preso dentro de outro elemento
  const elemento = conteudo && typeof document !== "undefined" ? createPortal(conteudo, document.body) : null;

  return { mostrar, elemento };
}
