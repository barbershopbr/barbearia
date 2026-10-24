"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { removerInscricaoPush, salvarInscricaoPush } from "@/app/sites/[slug]/push-actions";

function chaveParaBytes(b64: string): Uint8Array<ArrayBuffer> {
  const s = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

type Estado = "carregando" | "indisponivel" | "bloqueado" | "desligado" | "ligado";

/** Liga/desliga as notificações push deste navegador (cliente no site ou equipe no painel). */
export function BotaoNotificacoes({ slug, quem, chavePublica, className }: { slug: string; quem: "cliente" | "equipe"; chavePublica: string; className?: string }) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !chavePublica) return setEstado("indisponivel");
      if (Notification.permission === "denied") return setEstado("bloqueado");
      const reg = await navigator.serviceWorker.ready;
      setEstado((await reg.pushManager.getSubscription()) ? "ligado" : "desligado");
    })().catch(() => setEstado("indisponivel"));
  }, [chavePublica]);

  async function ligar() {
    setErro(null);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") return setEstado(permissao === "denied" ? "bloqueado" : "desligado");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chavePublica) }));
      const json = sub.toJSON();
      const r = await salvarInscricaoPush(slug, quem, { endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" });
      if (r.error) return setErro(r.error);
      setEstado("ligado");
    } catch {
      setErro("Não foi possível ativar neste navegador.");
    }
  }

  async function desligar() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await removerInscricaoPush(sub.endpoint);
      await sub.unsubscribe();
    }
    setEstado("desligado");
  }

  if (estado === "carregando" || estado === "indisponivel") return null;
  return (
    <div className={className}>
      {estado === "ligado" ? (
        <button type="button" onClick={desligar} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:underline">
          <Bell className="size-3.5" /> Notificações ativas (desativar)
        </button>
      ) : estado === "bloqueado" ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <BellOff className="size-3.5" /> Notificações bloqueadas no navegador
        </span>
      ) : (
        <button type="button" onClick={ligar} className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline">
          <Bell className="size-3.5" /> Ativar notificações
        </button>
      )}
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}
