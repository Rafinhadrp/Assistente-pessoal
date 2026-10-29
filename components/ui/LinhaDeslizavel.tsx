"use client";

import { useRef, useState } from "react";
import { IconeLixeira } from "./Icones";

const LIMITE = 96; // quanto arrastar (px) para apagar
const TOQUE = 8; // menos que isso é um toque, não um arrasto

// Linha que abre ao tocar e vai para a lixeira ao arrastar para a esquerda
export default function LinhaDeslizavel({
  children,
  aoAbrir,
  aoApagar,
}: {
  children: React.ReactNode;
  aoAbrir: () => void;
  aoApagar: () => void;
}) {
  const [dx, setDx] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const inicio = useRef<{ x: number; y: number; id: number } | null>(null);
  const direcao = useRef<"h" | "v" | null>(null);
  const passouDoLimite = useRef(false);
  const arrastou = useRef(false);

  function soltar() {
    const deslocamento = dx;
    inicio.current = null;
    setArrastando(false);
    setDx(0);
    if (direcao.current === "h" && deslocamento <= -LIMITE) aoApagar();
    // O toque simples abre pelo onClick (evita o "clique fantasma" do celular)
    direcao.current = null;
    passouDoLimite.current = false;
  }

  return (
    <div className="relative overflow-hidden">
      {/* Fundo vermelho que aparece ao arrastar */}
      <div
        className="absolute inset-0 flex items-center justify-end bg-gasto pr-6 text-white"
        style={{ opacity: Math.min(1, -dx / 40) }}
        aria-hidden
      >
        <span
          className="flex items-center gap-2 text-sm font-semibold transition-transform"
          style={{ transform: `scale(${-dx >= LIMITE ? 1.12 : 1})` }}
        >
          <IconeLixeira /> Apagar
        </span>
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && aoAbrir()}
        onClick={() => {
          if (!arrastou.current) aoAbrir();
        }}
        className="relative touch-pan-y select-none bg-[var(--superficie-forte)] outline-none focus-visible:ring-2 focus-visible:ring-destaque/40"
        style={{
          transform: `translateX(${dx}px)`,
          transition: arrastando ? "none" : "transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          inicio.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          direcao.current = null;
          arrastou.current = false;
        }}
        onPointerMove={(e) => {
          const i = inicio.current;
          if (!i || i.id !== e.pointerId) return;
          const mx = e.clientX - i.x;
          const my = e.clientY - i.y;
          if (direcao.current === null) {
            if (Math.abs(mx) < TOQUE && Math.abs(my) < TOQUE) return;
            direcao.current = Math.abs(mx) > Math.abs(my) ? "h" : "v";
            arrastou.current = true;
            if (direcao.current === "h") {
              setArrastando(true);
              e.currentTarget.setPointerCapture(e.pointerId);
            }
          }
          if (direcao.current !== "h") return;
          // Só para a esquerda; com resistência depois do limite
          const valor = Math.min(0, mx);
          const comResistencia = valor < -LIMITE ? -LIMITE + (valor + LIMITE) * 0.35 : valor;
          setDx(comResistencia);
          const passou = comResistencia <= -LIMITE;
          if (passou && !passouDoLimite.current) navigator.vibrate?.(12);
          passouDoLimite.current = passou;
        }}
        onPointerUp={soltar}
        onPointerCancel={() => {
          inicio.current = null;
          direcao.current = null;
          setArrastando(false);
          setDx(0);
        }}
      >
        {children}
      </div>
    </div>
  );
}
