import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { nivelSecao } from "@/lib/auth/papeis";
import { ConfiguracoesForm } from "./configuracoes-form";

export default async function ConfiguracoesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const staff = await getCurrentStaff(empresa.id);
  const podeEditar = !!staff && nivelSecao(staff, "configuracoes") === "editar";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Dados, contato e horários da barbearia. Logo, fotos e cores ficam em Aparência do site. As mudanças aparecem no site público na hora.
        </p>
      </div>

      {podeEditar ? (
        <ConfiguracoesForm empresa={empresa} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Você não tem permissão para alterar esta seção. Fale com o responsável.
        </p>
      )}
    </div>
  );
}
