"use client";

import { useActionState, useState } from "react";
import LogoAssistente from "@/components/LogoAssistente";
import { criarConta, entrar, type EstadoLogin } from "./actions";

export default function PaginaLogin() {
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [estadoEntrar, acaoEntrar, entrando] = useActionState<EstadoLogin, FormData>(entrar, {});
  const [estadoCriar, acaoCriar, criando] = useActionState<EstadoLogin, FormData>(criarConta, {});
  const estado = modo === "entrar" ? estadoEntrar : estadoCriar;
  const ocupado = entrando || criando;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]">
      <div className="mb-7 flex animate-entrar flex-col items-center text-center">
        <h1 className="sr-only">Assistente</h1>
        <LogoAssistente tamanho={136} humor="acenando" comNome />
        <p className="mt-2 text-suave">
          {modo === "entrar" ? "Que bom te ver de novo." : "Vamos começar? Crie sua conta."}
        </p>
      </div>

      <form
        action={modo === "entrar" ? acaoEntrar : acaoCriar}
        className="cartao animate-entrar space-y-4 p-5 [animation-delay:80ms]"
      >
        <label className="block">
          <span className="rotulo">E-mail</span>
          <input name="email" type="email" required autoComplete="email" placeholder="voce@email.com" className="campo" />
        </label>
        <label className="block">
          <span className="rotulo">Senha</span>
          <input
            name="senha"
            type="password"
            required
            minLength={6}
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            placeholder={modo === "entrar" ? "Sua senha" : "Pelo menos 6 caracteres"}
            className="campo"
          />
        </label>

        {estado.erro && (
          <p className="animate-entrar rounded-xl bg-gasto-suave px-3 py-2 text-sm text-gasto">{estado.erro}</p>
        )}
        {estado.aviso && (
          <p className="animate-entrar rounded-xl bg-receita-suave px-3 py-2 text-sm text-receita">{estado.aviso}</p>
        )}

        <button type="submit" disabled={ocupado} className="botao-primario w-full">
          {ocupado ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
        className="mt-5 text-sm text-suave transition hover:text-texto"
      >
        {modo === "entrar" ? (
          <>
            Ainda não tem conta? <span className="font-semibold text-destaque">Criar conta</span>
          </>
        ) : (
          <>
            Já tem conta? <span className="font-semibold text-destaque">Entrar</span>
          </>
        )}
      </button>
    </main>
  );
}
