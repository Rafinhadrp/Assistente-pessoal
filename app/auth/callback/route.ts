import { NextResponse } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";

// Link de confirmação do e-mail cai aqui: troca o código por uma sessão
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const codigo = searchParams.get("code");

  if (codigo) {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(`${origin}/`);
  }
  return NextResponse.redirect(`${origin}/login`);
}
