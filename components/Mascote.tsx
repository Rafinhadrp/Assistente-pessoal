import type { Humor } from "@/lib/humor";

// Mascote <R/> em pixel art. Animado (SVG) ou parado (PNG, mais leve).
export default function Mascote({
  humor,
  tamanho = 40,
  animado = true,
  className = "",
}: {
  humor: Humor;
  tamanho?: number;
  animado?: boolean;
  className?: string;
}) {
  const largo = humor === "programando"; // essa carinha é mais larga que alta
  return (
    <img
      src={animado ? `/mascote/svg/${humor}.svg` : `/mascote/png/${humor}.png`}
      alt={`Mascote ${humor}`}
      width={largo ? Math.round(tamanho * 1.5) : tamanho}
      height={tamanho}
      draggable={false}
      className={`select-none [image-rendering:pixelated] drop-shadow-[0_6px_12px_rgba(58,129,232,0.14)] ${className}`}
    />
  );
}
