// Fundo vivo: manchas de cor bem difusas que se mexem devagar + grão sutil.
// Fica atrás de tudo e não recebe toques.
export default function Ambiente() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -left-[20vw] -top-[15vh] h-[60vh] w-[70vw] animate-flutuar rounded-full opacity-60 blur-[90px]"
        style={{ background: "var(--mancha-1)" }}
      />
      <div
        className="absolute -right-[25vw] top-[25vh] h-[55vh] w-[65vw] animate-flutuar rounded-full opacity-50 blur-[100px] [animation-delay:-12s] [animation-duration:46s]"
        style={{ background: "var(--mancha-2)" }}
      />
      <div
        className="absolute -bottom-[20vh] left-[10vw] h-[50vh] w-[60vw] animate-flutuar rounded-full opacity-45 blur-[100px] [animation-delay:-24s] [animation-duration:52s]"
        style={{ background: "var(--mancha-3)" }}
      />
      <div className="grao absolute inset-0" />
    </div>
  );
}
