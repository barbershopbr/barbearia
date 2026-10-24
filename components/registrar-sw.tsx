"use client";

import { useEffect } from "react";

/** Registra o service worker do site da barbearia (instalar como app + notificações). */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sem SW o site funciona normalmente; só não instala/recebe push.
    });
  }, []);
  return null;
}
