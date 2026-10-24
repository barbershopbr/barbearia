import { NextResponse, type NextRequest } from "next/server";
import { verificarAssinatura } from "@/lib/pagamentos/cripto";
import { concluirConexaoBling } from "@/lib/fiscal/bling";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { nivelSecao } from "@/lib/auth/papeis";
import { masterOrigin, tenantOrigin } from "@/lib/tenant/domain";

/**
 * Retorno do "Conectar Bling" (URL fixa cadastrada no aplicativo do Bling).
 * Atende a barbearia (state.d = empresa_id) e o Master (state.d = "master").
 * Quem iniciou vem no state assinado e tem a permissão conferida de novo.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const estado = await verificarAssinatura<{ d: string; s?: string; u: string }>(params.get("state") ?? "");
  if (!estado) {
    return new NextResponse("Link de conexão inválido ou expirado. Volte ao painel e clique em Conectar novamente.", { status: 400 });
  }

  const ehMaster = estado.d === "master";
  const destino = ehMaster ? `${masterOrigin()}/notas-fiscais` : `${tenantOrigin(estado.s ?? "")}/admin/notas-fiscais`;
  const voltar = (r: string) => NextResponse.redirect(`${destino}?bling=${encodeURIComponent(r)}`);

  const code = params.get("code");
  if (!code) return voltar("cancelado");

  const admin = createSupabaseServiceRoleClient();
  if (ehMaster) {
    const { data } = await admin.from("master_admins").select("id").eq("id", estado.u).maybeSingle();
    if (!data) return voltar("sem-permissao");
  } else {
    const { data: staff } = await admin
      .from("usuarios_empresa")
      .select("role, permissions, ativo, empresa_id")
      .eq("id", estado.u)
      .maybeSingle();
    if (!staff?.ativo || staff.empresa_id !== estado.d || nivelSecao(staff, "notas-fiscais") !== "editar") {
      return voltar("sem-permissao");
    }
  }

  try {
    await concluirConexaoBling(ehMaster ? null : estado.d, code);
    return voltar("conectado");
  } catch (err) {
    console.error("[bling] falha no callback", err);
    return voltar("erro");
  }
}
