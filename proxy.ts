import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Roda antes de cada página: renova a sessão do Supabase e
// manda para /login quem não estiver logado.
export async function proxy(request: NextRequest) {
  // Aviso amigável se as variáveis não foram configuradas (ex: na Vercel)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return new NextResponse(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;max-width:32rem;margin:3rem auto;padding:0 1rem;line-height:1.5"><h1>Falta configurar</h1><p>As variáveis <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> não foram encontradas.</p><p>Na Vercel: Settings → Environment Variables. Depois faça um novo deploy (Deployments → ⋯ → Redeploy).</p>',
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;
  const rotaPublica =
    pathname.startsWith("/login") || pathname.startsWith("/auth") || pathname === "/api/versao";

  if (!logado && !rotaPublica) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ erro: "Faça login de novo." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (logado && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos, ícones, manifest e service worker
    "/((?!_next/static|_next/image|favicon.ico|icons/|mascote/|logo/|manifest.webmanifest|sw.js).*)",
  ],
};
