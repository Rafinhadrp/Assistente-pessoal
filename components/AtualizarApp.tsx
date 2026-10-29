"use client";

import { useEffect, useRef, useState } from "react";
import Mascote from "./Mascote";
import { IconeAtualizar } from "./ui/Icones";

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
          className="vidro-forte grid h-12 w-12 place-items-center rounded-full border shadow-lg"
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
            className="vidro-forte flex animate-entrar items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 text-sm font-medium shadow-lg"
          >
            <Mascote humor="chamando" tamanho={28} />
            Tem novidade no app · <span className="font-semibold text-destaque">Atualizar</span>
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
      className="grid h-10 w-10 place-items-center rounded-full text-suave transition hover:bg-superficie-2 hover:text-texto active:scale-95"
    >
      <IconeAtualizar className={`h-5 w-5 ${girando ? "animate-spin" : ""}`} />
    </button>
  );
}
