import "server-only";
import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Limite de tentativas por IP (login, cadastro, "esqueci a senha") contra
 * força bruta e criação de contas em massa. Usa o KV que o app já tem
 * (TENANT_DOMAINS, prefixo "rl:"). KV é eventualmente consistente, então o
 * limite é aproximado — suficiente para barrar abuso, não para contar exato.
 * Sem KV (desenvolvimento local), não limita.
 */
export async function dentroDoLimite(acao: string, max: number, janelaSegundos: number): Promise<boolean> {
  let kv: KVNamespace | undefined;
  try {
    kv = getCloudflareContext().env.TENANT_DOMAINS;
  } catch {
    return true;
  }
  if (!kv) return true;

  const h = await headers();
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
  const chave = `rl:${acao}:${ip}`;
  try {
    const atual = Number((await kv.get(chave)) ?? 0);
    if (atual >= max) return false;
    // TTL mínimo do KV é 60s.
    await kv.put(chave, String(atual + 1), { expirationTtl: Math.max(60, janelaSegundos) });
  } catch {
    return true; // falha no KV não pode derrubar o login
  }
  return true;
}

export const MSG_LIMITE = "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
