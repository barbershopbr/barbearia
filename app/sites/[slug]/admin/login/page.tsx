import { AuthShell } from "@/components/auth-shell";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { StaffLoginForm } from "./login-form";

export default async function AdminLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);

  return (
    <AuthShell title="Painel administrativo" subtitle={empresa?.nome ?? slug}>
      <StaffLoginForm slug={slug} />
    </AuthShell>
  );
}
