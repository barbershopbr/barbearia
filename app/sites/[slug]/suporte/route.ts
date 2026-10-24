import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tenantBasePath } from "@/lib/tenant/base-path";
import { COOKIE_SUPORTE } from "@/lib/plataforma";

/**
 * Entrada do "acessar como a barbearia" (painel Master). O Master gera um
 * link de uso único (magic link do responsável); aqui ele vira sessão no
 * domínio da barbearia — a sessão do Master no domínio dele não muda.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const base = await tenantBasePath(slug);
  const destino = new URL(`${base}/admin`, request.url);

  if (!tokenHash) return NextResponse.redirect(new URL(`${base}/admin/login`, request.url));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error) {
    return new NextResponse("Link de suporte inválido ou já usado. Gere outro no painel Master.", { status: 400 });
  }

  (await cookies()).set(COOKIE_SUPORTE, "1", { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 4, path: "/" });
  return NextResponse.redirect(destino);
}
