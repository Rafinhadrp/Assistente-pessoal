import { redirect } from "next/navigation";
import NavInferior from "@/components/NavInferior";
import { carregarPerfil } from "@/lib/perfil";
import { criarClienteServidor } from "@/lib/supabase/server";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const perfil = await carregarPerfil(supabase, data.user.email ?? "");

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <NavInferior perfil={{ nome: perfil.nome, nomeCompleto: perfil.nomeCompleto, email: perfil.email, avatar: perfil.avatar }} />
    </div>
  );
}
