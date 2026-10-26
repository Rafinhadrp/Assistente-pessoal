// Service worker simples: guarda os arquivos estáticos para abrir mais rápido
// e mostra uma página amigável quando estiver sem internet.
// Dados (finanças, agenda, chat) sempre vêm da internet, nunca do cache.
const CACHE = "assistente-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Arquivos estáticos do Next e ícones: cache primeiro
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (salvo) =>
          salvo ||
          fetch(request).then((resposta) => {
            const copia = resposta.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copia));
            return resposta;
          }),
      ),
    );
    return;
  }

  // Páginas: sempre da internet; sem internet, mostra aviso
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem internet</title><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#020617;color:#e2e8f0;text-align:center"><div><h1>Sem internet</h1><p>O assistente precisa de conexão. Tente de novo quando voltar.</p></div>',
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          ),
      ),
    );
  }
});
