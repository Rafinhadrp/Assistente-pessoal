import type { MetadataRoute } from "next";

// Faz o app ser instalável na tela inicial (PWA)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Assistente Pessoal",
    short_name: "Assistente",
    description: "Seu assistente pessoal: finanças, agenda e notas.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
