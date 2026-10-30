"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import MascoteAnimado from "../MascoteAnimado";
import { IconeFechar } from "./Icones";

let janelasAbertas = 0;

// Janela que sobe de baixo (no celular) ou aparece no centro (no computador)
export default function Folha({
  aberta,
  aoFechar,
  titulo,
  children,
}: {
  aberta: boolean;
  aoFechar: () => void;
  titulo: string;
  children: React.ReactNode;
}) {
  // Ignora toques no fundo logo que abre: no celular, o "clique fantasma" do toque
  // que abriu a janela cairia no fundo e fecharia ela na hora
  const abertaEm = useRef(0);
  useEffect(() => {
    if (!aberta) return;
    abertaEm.current = Date.now();
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", aoTeclar);
    // Trava a rolagem do fundo enquanto houver alguma janela aberta
    janelasAbertas++;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      janelasAbertas--;
      if (janelasAbertas === 0) document.body.style.overflow = "";
    };
  }, [aberta, aoFechar]);

  if (!aberta || typeof document === "undefined") return null;
  // Desenhada direto no <body>: se ficasse dentro de algo com efeito de vidro
  // (cabeçalho, cartão), a janela ficaria presa e cortada dentro dele
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal aria-label={titulo}>
      <div
        className="absolute inset-0 animate-surgir bg-black/40 backdrop-blur-[3px]"
        onClick={() => Date.now() - abertaEm.current > 400 && aoFechar()}
      />
      <div
        data-sem-puxar
        className="relative max-h-[90vh] w-full max-w-lg animate-subir overflow-y-auto vidro-forte rounded-t-[28px] border p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:animate-entrar sm:rounded-[28px]"
      >
        <div className="mx-auto -mt-2 mb-3 h-1.5 w-10 rounded-full bg-borda sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="grid h-9 w-9 place-items-center rounded-full text-suave hover:bg-superficie-2"
          >
            <IconeFechar />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// Pergunta de confirmação (ex: "Mover para a lixeira?")
export function Confirmar({
  aberta,
  titulo,
  mensagem,
  confirmar,
  perigoso,
  ocupado,
  aoConfirmar,
  aoCancelar,
}: {
  aberta: boolean;
  titulo: string;
  mensagem: React.ReactNode;
  confirmar: string;
  perigoso?: boolean;
  ocupado?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}) {
  return (
    <Folha aberta={aberta} aoFechar={aoCancelar} titulo={titulo}>
      {perigoso && (
        <div className="mb-3 flex justify-center">
          <MascoteAnimado animacao="desconfiado" tamanho={76} rotulo="Mascote desconfiado" />
        </div>
      )}
      <div className="text-sm leading-relaxed text-suave">{mensagem}</div>
      <div className="mt-5 grid grid-cols-[auto_1fr] gap-2 [&>button]:whitespace-nowrap">
        <button type="button" onClick={aoCancelar} className="botao-secundario px-5">
          Cancelar
        </button>
        <button
          type="button"
          onClick={aoConfirmar}
          disabled={ocupado}
          className={perigoso ? "botao-perigo" : "botao-primario"}
        >
          {ocupado ? "Aguarde..." : confirmar}
        </button>
      </div>
    </Folha>
  );
}
