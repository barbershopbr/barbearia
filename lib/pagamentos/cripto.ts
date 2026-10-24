import "server-only";

/**
 * Cifra credenciais de pagamento (AES-256-GCM) e assina dados que passam
 * pelo navegador (HMAC-SHA256), com Web Crypto — funciona igual no Worker e
 * no Node.
 *
 * Chave: APP_SECRET (secret do Worker; base64 de 32 bytes). Duas chaves
 * derivadas, uma para cada uso. Se APP_SECRET for trocada, as contas
 * conectadas precisam conectar de novo (os tokens antigos não decifram).
 */
const encoder = new TextEncoder();

function segredo(): string {
  const s = process.env.APP_SECRET;
  if (!s) throw new Error("APP_SECRET não configurada no servidor.");
  return s;
}

async function derivar(uso: "cifra" | "assinatura"): Promise<CryptoKey> {
  const bruto = await crypto.subtle.digest("SHA-256", encoder.encode(`${uso}:${segredo()}`));
  return uso === "cifra"
    ? crypto.subtle.importKey("raw", bruto, "AES-GCM", false, ["encrypt", "decrypt"])
    : crypto.subtle.importKey("raw", bruto, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

function paraBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(texto: string): Uint8Array<ArrayBuffer> {
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function cifrar(dados: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await derivar("cifra"), encoder.encode(JSON.stringify(dados))),
  );
  return `v1.${paraBase64Url(iv)}.${paraBase64Url(cifrado)}`;
}

export async function decifrar<T>(texto: string): Promise<T> {
  const [versao, iv, dados] = texto.split(".");
  if (versao !== "v1" || !iv || !dados) throw new Error("Formato de credencial desconhecido.");
  const claro = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: deBase64Url(iv) },
    await derivar("cifra"),
    deBase64Url(dados),
  );
  return JSON.parse(new TextDecoder().decode(claro)) as T;
}

/** Token assinado e com validade, para o "state" do OAuth e afins. */
export async function assinar(payload: Record<string, unknown>, validadeSegundos: number): Promise<string> {
  const corpo = paraBase64Url(encoder.encode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + validadeSegundos })));
  const assinatura = new Uint8Array(await crypto.subtle.sign("HMAC", await derivar("assinatura"), encoder.encode(corpo)));
  return `${corpo}.${paraBase64Url(assinatura)}`;
}

export async function verificarAssinatura<T extends Record<string, unknown>>(token: string): Promise<T | null> {
  const [corpo, assinatura] = token.split(".");
  if (!corpo || !assinatura) return null;
  const esperada = paraBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", await derivar("assinatura"), encoder.encode(corpo))));
  // Comparação em tempo constante.
  if (esperada.length !== assinatura.length) return null;
  let diff = 0;
  for (let i = 0; i < esperada.length; i++) diff |= esperada.charCodeAt(i) ^ assinatura.charCodeAt(i);
  if (diff !== 0) return null;
  const payload = JSON.parse(new TextDecoder().decode(deBase64Url(corpo))) as T & { exp?: number };
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
