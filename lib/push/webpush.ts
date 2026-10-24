/**
 * Web Push sem bibliotecas (WebCrypto puro — roda no Worker e no Node):
 *  - conteúdo cifrado no formato aes128gcm (RFC 8291 / RFC 8188);
 *  - identificação do servidor com VAPID (RFC 8292), JWT ES256.
 * Chaves: VAPID_PUBLIC_KEY (base64url, ponto não comprimido de 65 bytes) e
 * VAPID_PRIVATE_KEY (JWK EC P-256 com "d").
 */
export type InscricaoPush = { endpoint: string; p256dh: string; auth: string };

const enc = new TextEncoder();

export function b64urlParaBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function bytesParaB64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...partes: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of partes) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, bytes: number): Promise<Uint8Array<ArrayBuffer>> {
  const chave = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, chave, bytes * 8));
}

/** Cifra o conteúdo para a inscrição (corpo pronto para o POST ao serviço de push). */
export async function cifrarPayload(inscricao: InscricaoPush, payload: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const uaPublico = b64urlParaBytes(inscricao.p256dh);
  const authSecret = b64urlParaBytes(inscricao.auth);

  const efemera = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const asPublico = new Uint8Array(await crypto.subtle.exportKey("raw", efemera.publicKey));
  const uaChave = await crypto.subtle.importKey("raw", uaPublico, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaChave }, efemera.privateKey, 256));

  const ikm = await hkdf(authSecret, ecdh, concat(enc.encode("WebPush: info\0"), uaPublico, asPublico), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const chaveAes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // Registro único: conteúdo + delimitador 0x02 (último registro), sem padding.
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, chaveAes, concat(payload, new Uint8Array([2]))));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPublico.length]), asPublico, cifrado);
}

/** Cabeçalho Authorization VAPID para o serviço de push do endpoint. */
export async function cabecalhoVapid(endpoint: string, publicaB64: string, privadaJwk: JsonWebKey, contato: string): Promise<string> {
  const aud = new URL(endpoint).origin;
  const cabecalho = bytesParaB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const corpo = bytesParaB64url(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: contato })));
  const chave = await crypto.subtle.importKey("jwk", privadaJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  // WebCrypto já devolve a assinatura no formato do JWS (r||s, 64 bytes).
  const assinatura = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, chave, enc.encode(`${cabecalho}.${corpo}`)));
  return `vapid t=${cabecalho}.${corpo}.${bytesParaB64url(assinatura)}, k=${publicaB64}`;
}

/** Envia uma notificação. Retorna o status HTTP do serviço de push (404/410 = inscrição morta). */
export async function enviarPush(
  inscricao: InscricaoPush,
  dados: unknown,
  chaves: { publica: string; privada: JsonWebKey; contato: string },
  ttlSegundos = 86400,
): Promise<number> {
  const corpo = await cifrarPayload(inscricao, enc.encode(JSON.stringify(dados)));
  const res = await fetch(inscricao.endpoint, {
    method: "POST",
    headers: {
      Authorization: await cabecalhoVapid(inscricao.endpoint, chaves.publica, chaves.privada, chaves.contato),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(ttlSegundos),
      Urgency: "normal",
    },
    body: corpo,
  });
  return res.status;
}
