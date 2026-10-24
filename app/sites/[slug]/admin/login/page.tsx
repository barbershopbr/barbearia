import { AuthShell } from "@/components/auth-shell";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { StaffLoginForm } from "./login-form";

export default async function AdminLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ bemvindo?: string; email?: string }>;
}) {
  const { slug } = await params;
  const { bemvindo, email } = await searchParams;
  const empresa = await getEmpresaBySlug(slug);

  return (
    <AuthShell title="Painel administrativo" subtitle={empresa?.nome ?? slug}>
      {bemvindo && (
        <p className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          Barbearia criada! Entre com a senha que você acabou de cadastrar.
        </p>
      )}
      <StaffLoginForm slug={slug} emailInicial={email} />
    </AuthShell>
  );
}
