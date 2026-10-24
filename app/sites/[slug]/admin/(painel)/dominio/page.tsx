import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { nivelSecao } from "@/lib/auth/papeis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DominioConfigForm } from "@/components/dominio-config-form";
import { tenantLabel } from "@/lib/tenant/domain";
import { configurarDominioTenant, verificarDominioTenant, removerDominioTenant } from "./actions";
import { temRecurso } from "@/lib/plano/recursos";
import { RecursoBloqueado } from "@/components/recurso-bloqueado";

export default async function DominioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;
  if (!temRecurso(empresa, "dominio_proprio")) return <RecursoBloqueado recurso="dominio_proprio" />;

  const staff = await getCurrentStaff(empresa.id);
  const podeEditar = !!staff && nivelSecao(staff, "dominio") === "editar";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Domínio</h1>
        <p className="text-sm text-muted-foreground">
          Endereço atual: <span className="font-medium">{tenantLabel(slug)}</span>. Configure um domínio próprio
          (ex.: {slug}.com.br) e ele passa a ser usado no lugar desse endereço.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Domínio próprio</CardTitle>
        </CardHeader>
        <CardContent>
          {podeEditar ? (
            <DominioConfigForm
              dominioPrincipal={empresa.dominio_principal}
              dominioStatus={empresa.dominio_status}
              onConfigurar={configurarDominioTenant.bind(null, slug)}
              onVerificar={verificarDominioTenant.bind(null, slug)}
              onRemover={removerDominioTenant.bind(null, slug)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Você não tem permissão para alterar esta seção. Fale com o responsável.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
