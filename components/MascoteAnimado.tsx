"use client";

// Mascote <R/> animado com as tiras de quadros do pacote original (pixel art).
// Cada animação é uma imagem com os quadros lado a lado; o CSS só desliza
// a imagem de quadro em quadro (leve até em celular simples).

export const ANIMACOES = {
  parado: { quadros: 14, ms: 170 }, // fica imóvel um tempo e pisca
  acenando: { quadros: 4, ms: 170 },
  pulando: { quadros: 5, ms: 140 }, // comemoração: toca uma vez
  erro: { quadros: 8, ms: 160 },
  chamando: { quadros: 6, ms: 170 },
  pensando: { quadros: 6, ms: 190 },
  desconfiado: { quadros: 6, ms: 200 },
} as const;

export type Animacao = keyof typeof ANIMACOES;

const PROPORCAO = 192 / 208; // largura / altura de cada quadro

export default function MascoteAnimado({
  animacao,
  tamanho = 64,
  umaVez = false,
  aoTerminar,
  className = "",
  rotulo,
}: {
  animacao: Animacao;
  tamanho?: number; // altura em px
  umaVez?: boolean | number; // toca uma vez (ou N vezes) e para (ex: pulo de comemoração)
  aoTerminar?: () => void;
  className?: string;
  rotulo?: string;
}) {
  const { quadros, ms } = ANIMACOES[animacao];
  return (
    <span
      key={animacao /* recomeça a animação quando muda */}
      role="img"
      aria-label={rotulo ?? `Mascote ${animacao}`}
      onAnimationEnd={aoTerminar}
      className={`sprite-mascote inline-block shrink-0 select-none ${className}`}
      style={{
        width: Math.round(tamanho * PROPORCAO),
        height: tamanho,
        backgroundImage: `url(/mascote/sprites/${animacao}.png)`,
        backgroundSize: `${quadros * 100}% 100%`,
        animation: `quadros-mascote ${quadros * ms}ms steps(${quadros}, jump-none) ${
          umaVez ? `${umaVez === true ? 1 : umaVez} forwards` : "infinite"
        }`,
      }}
    />
  );
}
