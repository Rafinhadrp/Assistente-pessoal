import type { Metadata, Viewport } from "next";
import RegistrarServiceWorker from "@/components/RegistrarServiceWorker";
import "./globals.css";

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
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
