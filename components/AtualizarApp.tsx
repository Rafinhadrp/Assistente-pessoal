"use client";

import { useEffect, useRef, useState } from "react";
import Mascote from "./Mascote";

const LIMITE = 80; // quanto puxar (px) para atualizar
const MAXIMO = 120; // até onde a bolinha desce
const VERIFICAR_A_CADA_MS = 5 * 60 * 1000;

function recarregar() {
  window.location.reload();
}

// Puxar a tela para baixo para atualizar (como no Chrome/Safari)
// e aviso quando houver uma versão nova do app publicada.
export default function AtualizarApp({ versao }: { versao: string }) {
  const [puxado, setPuxado] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const [versaoNova, setVersaoNova] = useState(false);
  const inicioY = useRef<number | null>(null);
  const distancia = useRef(0);

  // ---- Puxar para atualizar ----
  useEffect(() => {
    function podeComecar(alvo: EventTarget | null) {
      if (window.scrollY > 0) return false;
      // Não atrapalha quem está digitando ou rolando uma caixa de texto
      return !(alvo instanceof Element && alvo.closest("textarea, input, select, [data-sem-puxar]"));
    }

    function aoTocar(e: TouchEvent) {
      if (e.touches.length !== 1 || !podeComecar(e.target)) return;
      inicioY.current = e.touches[0].clientY;
      distancia.current = 0;
    }

    function aoMover(e: TouchEvent) {
      if (inicioY.current === null) return;
      const dy = e.touches[0].clientY - inicioY.current;
      if (dy <= 0 || window.scrollY > 0) {
        inicioY.current = null;
        distancia.current = 0;
        setPuxado(0);
        return;
      }
      // Resistência: quanto mais puxa, mais "pesado" fica
      distancia.current = Math.min(MAXIMO, dy * 0.5);
      setPuxado(distancia.current);
    }

    function aoSoltar() {
      if (inicioY.current === null) return;
      inicioY.current = null;
      if (distancia.current >= LIMITE) {
        setAtualizando(true);
        setPuxado(LIMITE);
        setTimeout(recarregar, 150);
      } else {
        setPuxado(0);
      }
      distancia.current = 0;
    }

    window.addEventListener("touchstart", aoTocar, { passive: true });
    window.addEventListener("touchmove", aoMover, { passive: true });
    window.addEventListener("touchend", aoSoltar);
    window.addEventListener("touchcancel", aoSoltar);
    return () => {
      window.removeEventListener("touchstart", aoTocar);
      window.removeEventListener("touchmove", aoMover);
      window.removeEventListener("touchend", aoSoltar);
      window.removeEventListener("touchcancel", aoSoltar);
    };
  }, []);

  // ---- Aviso de versão nova ----
  useEffect(() => {
    if (versao === "local") return;
    async function verificar() {
      try {
        const r = await fetch("/api/versao", { cache: "no-store" });
        const { versao: publicada } = await r.json();
        if (publicada && publicada !== versao) setVersaoNova(true);
      } catch {
        // sem internet: tenta depois
      }
    }
    // Confere ao voltar para o app e de tempos em tempos
    const aoVoltar = () => document.visibilityState === "visible" && verificar();
    document.addEventListener("visibilitychange", aoVoltar);
    const intervalo = setInterval(verificar, VERIFICAR_A_CADA_MS);
    verificar();
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      clearInterval(intervalo);
    };
  }, [versao]);

  const progresso = Math.min(1, puxado / LIMITE);
  const visivel = puxado > 0 || atualizando;

  return (
    <>
      <div
        aria-hidden={!visivel}
        className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
        style={{
          transform: `translateY(calc(env(safe-area-inset-top) + ${puxado - 44}px))`,
          opacity: visivel ? 1 : 0,
          transition: inicioY.current === null ? "transform 200ms, opacity 200ms" : "none",
        }}
      >
        <div
          className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
          style={{ transform: `scale(${0.6 + progresso * 0.4})` }}
        >
          {/* O mascote "carregando" aparece quando já dá para soltar */}
          <Mascote humor={atualizando || progresso >= 1 ? "carregando" : "espiando"} tamanho={36} />
        </div>
      </div>

      {versaoNova && (
        <div className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-[calc(0.5rem+env(safe-area-inset-top))]">
          <button
            onClick={recarregar}
            className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg"
          >
            Nova versão disponível · <span className="underline">Atualizar</span>
          </button>
        </div>
      )}
    </>
  );
}

// Botão ↻ para atualizar (útil no computador)
export function BotaoAtualizar() {
  const [girando, setGirando] = useState(false);
  return (
    <button
      type="button"
      aria-label="Atualizar"
      title="Atualizar"
      onClick={() => {
        setGirando(true);
        recarregar();
      }}
      className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-5 w-5 ${girando ? "animate-spin" : ""}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M20 12a8 8 0 1 1-2.34-5.66" />
        <path d="M20 4v4h-4" />
      </svg>
    </button>
  );
}
