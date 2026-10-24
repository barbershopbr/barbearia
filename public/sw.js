/* Service worker dos sites das barbearias (PWA + notificações push).
 * Não faz cache de páginas: agenda e loja precisam estar sempre atualizadas.
 * Servido em /sw.js de cada subdomínio; o escopo é o site daquela barbearia. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Rede direto (o handler existe para o navegador oferecer "instalar app").
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { titulo: event.data ? event.data.text() : "" };
  }
  const titulo = dados.titulo || "Novidade da barbearia";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: dados.corpo || "",
      icon: dados.icone || undefined,
      badge: dados.icone || undefined,
      data: { url: dados.url || "/" },
      tag: dados.tag || undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if (j.url.includes(url) && "focus" in j) return j.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
