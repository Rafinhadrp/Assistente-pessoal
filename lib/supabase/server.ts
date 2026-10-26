import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente do Supabase para o servidor (páginas, rotas de API, server actions).
// Usa o login do usuário (cookies), então o RLS do banco é respeitado.
export async function criarClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado de um Server Component: pode ignorar,
            // o proxy.ts já renova a sessão.
          }
        },
      },
    },
  );
}
