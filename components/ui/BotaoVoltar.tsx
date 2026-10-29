"use client";

import { useRouter } from "next/navigation";
import { IconeVoltar } from "./Icones";

// Volta para a tela anterior (ou para o início, se abriu direto)
export default function BotaoVoltar() {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-suave transition hover:bg-superficie-2 hover:text-texto active:scale-95"
    >
      <IconeVoltar />
    </button>
  );
}
