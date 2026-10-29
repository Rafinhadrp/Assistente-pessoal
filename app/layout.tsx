import type { Metadata, Viewport } from "next";
import { Inter, Silkscreen } from "next/font/google";
import AtualizarApp from "@/components/AtualizarApp";
import Ambiente from "@/components/ui/Ambiente";
import RegistrarServiceWorker from "@/components/RegistrarServiceWorker";
import { VERSAO } from "@/lib/versao";
import "./globals.css";

// Inter para os textos; Silkscreen (pixel) só para detalhes da marca, combinando com o mascote
const fonteTexto = Inter({ subsets: ["latin"], variable: "--fonte-texto", display: "swap" });
const fontePixel = Silkscreen({ subsets: ["latin"], weight: "400", variable: "--fonte-pixel", display: "swap" });

export const metadata: Metadata = {
  title: "Assistente",
  description: "Seu assistente pessoal: finanças, agenda e notas.",
  applicationName: "Assistente",
  appleWebApp: { capable: true, title: "Assistente", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fonteTexto.variable} ${fontePixel.variable}`}>
      <body className="font-sans">
        <Ambiente />
        {children}
        <RegistrarServiceWorker />
        <AtualizarApp versao={VERSAO} />
      </body>
    </html>
  );
}
