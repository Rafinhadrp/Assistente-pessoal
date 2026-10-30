"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconeCalendario, IconeCarteira, IconeChat } from "./ui/Icones";

const abas = [
  { href: "/", rotulo: "Chat", Icone: IconeChat },
  { href: "/financas", rotulo: "Finanças", Icone: IconeCarteira },
  { href: "/agenda", rotulo: "Agenda", Icone: IconeCalendario },
];

export default function NavInferior() {
  const caminho = usePathname();
  return (
    <nav className="r-navegacao fixed z-30 vidro-forte p-1.5" aria-label="Navegação principal">
      <ul className="mx-auto flex max-w-2xl gap-1">
        {abas.map(({ href, rotulo, Icone }) => {
          const ativa = href === "/" ? caminho === "/" : caminho.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={ativa ? "page" : undefined}
                className={`r-navegacao__aba group flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold transition ${
                  ativa ? "text-destaque" : "text-suave hover:text-texto"
                }`}
              >
                <span
                  className={`grid h-8 w-14 place-items-center rounded-full transition ${
                    ativa ? "bg-destaque-suave" : "group-active:bg-superficie-2"
                  }`}
                >
                  <Icone className="h-[22px] w-[22px]" />
                </span>
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
