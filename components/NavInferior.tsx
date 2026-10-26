"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const abas = [
  { href: "/", rotulo: "Chat", icone: "💬" },
  { href: "/financas", rotulo: "Finanças", icone: "💰" },
  { href: "/agenda", rotulo: "Agenda", icone: "📅" },
];

export default function NavInferior() {
  const caminho = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <ul className="mx-auto flex max-w-2xl">
        {abas.map((aba) => {
          const ativa = aba.href === "/" ? caminho === "/" : caminho.startsWith(aba.href);
          return (
            <li key={aba.href} className="flex-1">
              <Link
                href={aba.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition ${
                  ativa
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <span className="text-xl leading-none">{aba.icone}</span>
                {aba.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
