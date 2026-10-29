// Mostrado quando o código é mais novo que o banco (faltou rodar o schema.sql)
export function bancoDesatualizado(erro: { code?: string } | null | undefined) {
  return erro?.code === "42703" || erro?.code === "PGRST202"; // coluna ou função que não existe
}

export default function AvisoBanco() {
  return (
    <div className="cartao space-y-2 p-5 text-sm">
      <p className="font-semibold text-aviso">Falta atualizar o banco de dados</p>
      <p className="text-suave">
        Esta versão do app precisa de uma atualização no Supabase. Abra o <strong>SQL Editor</strong>, cole todo o
        arquivo <code className="rounded bg-superficie-2 px-1">supabase/schema.sql</code> do projeto e clique em{" "}
        <strong>Run</strong>. Depois puxe a tela para atualizar.
      </p>
    </div>
  );
}
