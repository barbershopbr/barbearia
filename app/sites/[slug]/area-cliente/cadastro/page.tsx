import { AuthShell } from "@/components/auth-shell";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { CadastroForm } from "./cadastro-form";

export default async function CadastroClientePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);

  return (
    <AuthShell title="Criar conta" subtitle={empresa?.nome ?? slug}>
      <CadastroForm slug={slug} />
    </AuthShell>
  );
}
