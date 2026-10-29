// Ícones em traço (estilo único em todo o app)
type P = { className?: string };
const base = (className = "h-5 w-5") => ({
  className,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconeChat = ({ className }: P) => (
  <svg {...base(className)}><path d="M21 12a8 8 0 0 1-11.7 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></svg>
);
export const IconeCarteira = ({ className }: P) => (
  <svg {...base(className)}><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M3 10h18M16 15h2" /><path d="M7 6V5a2 2 0 0 1 2-2h8" /></svg>
);
export const IconeCalendario = ({ className }: P) => (
  <svg {...base(className)}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
);
export const IconeLixeira = ({ className }: P) => (
  <svg {...base(className)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
);
export const IconeAtualizar = ({ className }: P) => (
  <svg {...base(className)}><path d="M20 12a8 8 0 1 1-2.34-5.66" /><path d="M20 4v4h-4" /></svg>
);
export const IconeSair = ({ className }: P) => (
  <svg {...base(className)}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" /></svg>
);
export const IconeVoltar = ({ className }: P) => (
  <svg {...base(className)}><path d="m15 18-6-6 6-6" /></svg>
);
export const IconeAvancar = ({ className }: P) => (
  <svg {...base(className)}><path d="m9 18 6-6-6-6" /></svg>
);
export const IconeLapis = ({ className }: P) => (
  <svg {...base(className)}><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" /></svg>
);
export const IconeRestaurar = ({ className }: P) => (
  <svg {...base(className)}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
);
export const IconeFechar = ({ className }: P) => (
  <svg {...base(className)}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const IconeMicrofone = ({ className }: P) => (
  <svg {...base(className)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
);
export const IconeEnviar = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 19V5M5 12l7-7 7 7" /></svg>
);
export const IconeSetaCima = ({ className }: P) => (
  <svg {...base(className)}><path d="M7 17 17 7M8 7h9v9" /></svg>
);
export const IconeSetaBaixo = ({ className }: P) => (
  <svg {...base(className)}><path d="M17 7 7 17M16 17H7V8" /></svg>
);
export const IconeRelogio = ({ className }: P) => (
  <svg {...base(className)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
