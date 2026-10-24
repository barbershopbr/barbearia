import { AuthShell } from "@/components/auth-shell";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { RedefinirSenhaForm } from "./redefinir-senha-form";

export default async function RedefinirSenhaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await params;
  const { token } = await searchParams;
  const empresa = await getEmpresaBySlug(slug);

  return (
    <AuthShell title="Redefinir senha" subtitle={empresa?.nome ?? slug}>
      {token ? (
        <RedefinirSenhaForm token={token} />
      ) : (
        <p className="text-sm text-destructive">Link inválido: token ausente.</p>
      )}
    </AuthShell>
  );
}
