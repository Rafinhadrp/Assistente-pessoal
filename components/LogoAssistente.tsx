import Mascote from "./Mascote";
import type { Humor } from "@/lib/humor";

// Logo do app Assistente: o mascote <R/> com um balão de conversa.
// Mesma grade de pixels do mascote (32 x 32), para combinar com o estilo dele.
export default function LogoAssistente({
  tamanho = 128,
  humor = "feliz",
  comNome = false,
}: {
  tamanho?: number;
  humor?: Humor;
  comNome?: boolean;
}) {
  const u = tamanho / 32; // um "pixel" do mascote
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: tamanho, height: tamanho }}>
        <div className="absolute" style={{ left: -2 * u, top: 3 * u }}>
          <Mascote humor={humor} tamanho={tamanho} />
        </div>
        <img
          src="/logo/balao.svg"
          alt=""
          aria-hidden
          className="absolute [image-rendering:pixelated]"
          style={{ left: 19 * u, top: 1 * u, width: 12 * u, height: 10 * u }}
        />
      </div>
      {comNome && (
        <p className="mt-2 flex items-baseline gap-2 text-[1.7rem] font-bold tracking-tight">
          Assistente
          <span className="font-pixel text-sm font-normal text-destaque">&lt;R/&gt;</span>
        </p>
      )}
    </div>
  );
}
