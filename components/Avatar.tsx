import { inicial, type Perfil } from "@/lib/perfil";

// Bolinha do perfil: a foto, ou a primeira letra do nome (como no app do Claude)
export default function Avatar({
  perfil,
  tamanho = 32,
  className = "",
}: {
  perfil: Pick<Perfil, "nome" | "email" | "avatar">;
  tamanho?: number;
  className?: string;
}) {
  const estilo = { width: tamanho, height: tamanho };
  if (perfil.avatar) {
    return (
      <img
        src={perfil.avatar}
        alt=""
        style={estilo}
        className={`shrink-0 rounded-full object-cover ring-1 ring-white/25 ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ ...estilo, fontSize: tamanho * 0.45 }}
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#5b9cff] to-[#2f5fd0] font-semibold text-white ring-1 ring-white/25 ${className}`}
    >
      {inicial(perfil)}
    </span>
  );
}
