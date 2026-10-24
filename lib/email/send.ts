import "server-only";

/**
 * Envio de e-mail transacional via Resend (API REST — sem SDK, roda igual em
 * Node e no Worker da Cloudflare).
 *
 * Variáveis:
 * - RESEND_API_KEY: chave "Sending access" do Resend. Sem ela, o e-mail só é
 *   registrado no log do servidor (útil em desenvolvimento).
 * - EMAIL_FROM: remetente, ex. "BarberControl <nao-responda@usebrcontrol.com.br>".
 *   O domínio precisa estar verificado no Resend; até lá, o remetente de
 *   teste "onboarding@resend.dev" só entrega para o e-mail dono da conta Resend.
 */
const DEFAULT_FROM = "BarberControl <onboarding@resend.dev>";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Nome exibido no remetente (ex.: nome da barbearia). O endereço continua o de EMAIL_FROM. */
  fromName?: string;
  replyTo?: string;
};

export async function sendEmail(message: EmailMessage): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email] RESEND_API_KEY ausente — não enviado. Para ${message.to}: ${message.subject}\n${message.text}`);
    return { ok: false, error: "Provedor de e-mail não configurado." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: withFromName(process.env.EMAIL_FROM || DEFAULT_FROM, message.fromName),
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      reply_to: message.replyTo,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[email] Resend respondeu ${res.status} para ${message.to}: ${detail}`);
    return { ok: false, error: "Falha ao enviar e-mail." };
  }
  return { ok: true };
}

/** Troca o nome exibido mantendo o endereço: "X <a@b>" + "Barbearia Y" -> "Barbearia Y <a@b>". */
function withFromName(from: string, name?: string): string {
  if (!name) return from;
  const address = from.match(/<([^>]+)>/)?.[1] ?? from;
  return `${name.replace(/["<>]/g, "")} <${address}>`;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Layout mínimo e compatível com clientes de e-mail (tabela + estilos inline). */
export function emailLayout({ titulo, corpo, botao }: { titulo: string; corpo: string; botao?: { texto: string; url: string } }): string {
  const cta = botao
    ? `<p style="margin:24px 0"><a href="${escapeHtml(botao.url)}" style="background:#111;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">${escapeHtml(botao.texto)}</a></p>
       <p style="font-size:12px;color:#666">Se o botão não funcionar, copie e cole este link no navegador:<br>${escapeHtml(botao.url)}</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:8px;padding:32px"><tr><td style="color:#111;font-size:15px;line-height:1.5">
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(titulo)}</h1>
${corpo}
${cta}
</td></tr></table>
<p style="font-size:11px;color:#999;margin-top:16px">Enviado por BarberControl</p>
</td></tr></table></body></html>`;
}
