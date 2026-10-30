import FormularioPerfil from "@/components/FormularioPerfil";
import Cabecalho from "@/components/ui/Cabecalho";
import { carregarPerfil } from "@/lib/perfil";
import { criarClienteServidor } from "@/lib/supabase/server";

export default async function PaginaPerfil() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getUser();
  const perfil = await carregarPerfil(supabase, data.user?.email ?? "");

  return (
    <>
      <Cabecalho titulo="Perfil" subtitulo="Suas informações" />
      <main className="px-4 pb-8 pt-4">
        <FormularioPerfil perfil={perfil} />
      </main>
    </>
  );
}
