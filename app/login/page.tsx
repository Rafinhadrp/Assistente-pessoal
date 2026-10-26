"use client";

import { useActionState, useState } from "react";
import { criarConta, entrar, type EstadoLogin } from "./actions";

export default function PaginaLogin() {
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [estadoEntrar, acaoEntrar, entrando] = useActionState<EstadoLogin, FormData>(entrar, {});
  const [estadoCriar, acaoCriar, criando] = useActionState<EstadoLogin, FormData>(criarConta, {});
  const estado = modo === "entrar" ? estadoEntrar : estadoCriar;
  const ocupado = entrando || criando;

  return (
    <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-indigo-600 text-3xl text-white shadow-lg">
          ✦
        </div>
        <h1 className="text-2xl font-semibold">Assistente</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {modo === "entrar" ? "Entre para continuar" : "Crie sua conta"}
        </p>
      </div>

      <form action={modo === "entrar" ? acaoEntrar : acaoCriar} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">E-mail</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Senha</span>
          <input
            name="senha"
            type="password"
            required
            minLength={6}
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>

        {estado.erro && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {estado.erro}
          </p>
        )}
        {estado.aviso && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {estado.aviso}
          </p>
        )}

        <button
          type="submit"
          disabled={ocupado}
          className="w-full rounded-xl bg-indigo-600 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {ocupado ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
        className="mt-6 text-sm text-indigo-600 hover:underline dark:text-indigo-400"
      >
        {modo === "entrar" ? "Ainda não tem conta? Criar conta" : "Já tem conta? Entrar"}
      </button>
    </main>
  );
}
