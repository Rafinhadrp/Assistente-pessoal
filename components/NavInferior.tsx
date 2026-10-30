"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { nomeExibido, type Perfil } from "@/lib/perfil";
import Avatar from "./Avatar";
import { IconeCalendario, IconeCarteira, IconeChat } from "./ui/Icones";

const abas = [
  { href: "/", rotulo: "Chat", Icone: IconeChat },
  { href: "/financas", rotulo: "Finanças", Icone: IconeCarteira },
  { href: "/agenda", rotulo: "Agenda", Icone: IconeCalendario },
];

type PerfilNav = Pick<Perfil, "nome" | "nomeCompleto" | "email" | "avatar">;

export default function NavInferior({ perfil }: { perfil: PerfilNav }) {
  const caminho = usePathname();
  const naConta = caminho.startsWith("/perfil");
  return (
    <nav className="r-navegacao fixed z-30 vidro-forte p-1.5" aria-label="Navegação principal">
      <ul className="mx-auto flex max-w-2xl items-stretch gap-1">
        {abas.map(({ href, rotulo, Icone }) => {
          const ativa = href === "/" ? caminho === "/" : caminho.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={ativa ? "page" : undefined}
                className={`r-navegacao__aba flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold transition active:scale-95 ${
                  ativa ? "text-destaque" : "text-suave hover:text-texto"
                }`}
              >
                <Icone className="h-[23px] w-[23px]" />
                {rotulo}
              </Link>
            </li>
          );
        })}
        {/* Conta: no celular só a bolinha; no computador, a bolinha com o nome */}
        <li className="shrink-0 sm:flex-1">
          <Link
            href="/perfil"
            aria-current={naConta ? "page" : undefined}
            aria-label="Perfil"
            className={`r-navegacao__aba flex items-center justify-center gap-2 px-3 transition active:scale-95 sm:justify-start sm:px-3 ${
              naConta ? "text-destaque" : "text-suave hover:text-texto"
            }`}
          >
            <Avatar perfil={perfil} tamanho={32} />
            <span className="hidden min-w-0 truncate text-sm font-semibold text-texto sm:block">{nomeExibido(perfil)}</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
