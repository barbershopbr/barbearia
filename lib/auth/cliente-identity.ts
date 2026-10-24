import { createHash } from "node:crypto";

/**
 * auth.users.email é único GLOBALMENTE no projeto Supabase, mas o requisito de
 * produto é cadastro 100% independente por barbearia (o mesmo e-mail real cria
 * contas separadas, com senhas separadas, em barbearias diferentes). A saída é
 * autenticar com um e-mail sintético derivado de (empresa_id + e-mail real) —
 * nunca exibido ao usuário nem usado para enviar e-mails de verdade.
 */
export function syntheticAuthEmail(empresaId: string, realEmail: string): string {
  const normalized = realEmail.trim().toLowerCase();
  const hash = createHash("sha256").update(`${empresaId}:${normalized}`).digest("hex").slice(0, 32);
  return `cliente-${hash}@auth.internal`;
}
