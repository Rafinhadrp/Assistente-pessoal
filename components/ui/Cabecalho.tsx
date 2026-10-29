// Cabeçalho padrão das telas: título grande, subtítulo e ações à direita
export default function Cabecalho({
  titulo,
  subtitulo,
  icone,
  acoes,
}: {
  titulo: string;
  subtitulo?: string;
  icone?: React.ReactNode;
  acoes?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 vidro-forte border-b px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] ">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {icone}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight">{titulo}</h1>
            {subtitulo && <p className="truncate text-xs text-suave">{subtitulo}</p>}
          </div>
        </div>
        {acoes && <div className="flex shrink-0 items-center gap-1">{acoes}</div>}
      </div>
    </header>
  );
}

// Botão redondo de ícone, usado nos cabeçalhos
export function BotaoIcone({
  rotulo,
  children,
  href,
  ...resto
}: { rotulo: string; href?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes =
    "grid h-10 w-10 place-items-center rounded-full text-suave transition hover:bg-superficie-2 hover:text-texto active:scale-95";
  if (href) {
    return (
      <a href={href} aria-label={rotulo} title={rotulo} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" aria-label={rotulo} title={rotulo} className={classes} {...resto}>
      {children}
    </button>
  );
}
