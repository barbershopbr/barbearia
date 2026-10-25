import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { ContaForm } from "./conta-form";

export default async function MinhaContaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  const staff = empresa ? await getCurrentStaff(empresa.id) : null;
  if (!staff) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Minha conta</h1>
        <p className="text-sm text-muted-foreground">Seu nome, e-mail de acesso e senha do painel.</p>
      </div>
      <ContaForm slug={slug} nome={staff.nome} email={staff.email} />
    </div>
  );
}
