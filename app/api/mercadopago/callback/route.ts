import { NextResponse, type NextRequest } from "next/server";
import { verificarAssinatura } from "@/lib/pagamentos/cripto";
import { concluirConexao } from "@/lib/pagamentos/mercadopago";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { nivelSecao } from "@/lib/auth/papeis";
import { tenantOrigin } from "@/lib/tenant/domain";

/**
 * Retorno do "Conectar Mercado Pago". Fica no domínio principal (URL fixa
 * cadastrada na aplicação do MP); a sessão do painel é do subdomínio da
 * barbearia, então quem iniciou a conexão vem no `state` assinado e é
 * conferido de novo aqui.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const estado = await verificarAssinatura<{ e: string; s: string; u: string }>(params.get("state") ?? "");
  if (!estado) {
    return new NextResponse("Link de conexão inválido ou expirado. Volte ao painel e clique em Conectar novamente.", { status: 400 });
  }

  const voltar = (resultado: string) =>
    NextResponse.redirect(`${tenantOrigin(estado.s)}/admin/pagamentos?mp=${encodeURIComponent(resultado)}`);

  const code = params.get("code");
  if (!code) return voltar(params.get("error") === "access_denied" ? "cancelado" : "erro");

  // Quem iniciou ainda está ativo e pode editar recebimentos?
  const admin = createSupabaseServiceRoleClient();
  const { data: staff } = await admin
    .from("usuarios_empresa")
    .select("role, permissions, ativo, empresa_id")
    .eq("id", estado.u)
    .maybeSingle();
  if (!staff?.ativo || staff.empresa_id !== estado.e || nivelSecao(staff, "pagamentos") !== "editar") {
    return voltar("sem-permissao");
  }

  try {
    await concluirConexao(estado.e, code);
    return voltar("conectado");
  } catch (err) {
    console.error("[mercadopago] falha no callback", err);
    return voltar("erro");
  }
}
