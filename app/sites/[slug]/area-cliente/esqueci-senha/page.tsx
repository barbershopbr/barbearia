import { AuthShell } from "@/components/auth-shell";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { EsqueciSenhaForm } from "./esqueci-senha-form";

export default async function EsqueciSenhaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);

  return (
    <AuthShell title="Esqueci minha senha" subtitle={empresa?.nome ?? slug}>
      <EsqueciSenhaForm slug={slug} />
    </AuthShell>
  );
}
