"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

  const elemento = aviso ? (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto flex animate-entrar items-center gap-4 rounded-2xl bg-[#1c2430]/92 px-4 py-3 text-sm text-white shadow-xl backdrop-blur-xl dark:bg-[#e6edf3]/92 dark:text-[#0b0f14]"
      >
        <span>{aviso.mensagem}</span>
        {aviso.acao && (
          <button
            type="button"
            onClick={() => {
              aviso.acao!.fazer();
              setAviso(null);
            }}
            className="font-semibold text-[#8cc4ff] dark:text-[#0a66d1]"
          >
            {aviso.acao.rotulo}
          </button>
        )}
      </div>
    </div>
  ) : null;

  return { mostrar, elemento };
}
