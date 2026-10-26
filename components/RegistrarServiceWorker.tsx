"use client";

import { useEffect } from "react";

// Registra o service worker (necessário para instalar como app)
export default function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
