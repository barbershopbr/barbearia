import { AuthShell } from "@/components/auth-shell";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { LoginForm } from "./login-form";

export default async function LoginClientePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);

  return (
    <AuthShell title="Entrar" subtitle={empresa?.nome ?? slug}>
      <LoginForm slug={slug} />
    </AuthShell>
  );
}
