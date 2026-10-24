import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DominioConfigForm } from "@/components/dominio-config-form";
import { rootDomain } from "@/lib/tenant/domain";
import { configurarDominioTenant, verificarDominioTenant, removerDominioTenant } from "./actions";

export default async function DominioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const staff = await getCurrentStaff(empresa.id);
  const podeEditar = staff && (staff.role === "owner" || staff.role === "admin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Domínio</h1>
        <p className="text-sm text-muted-foreground">
          Endereço atual: <span className="font-medium">{slug}.{rootDomain()}</span>. Configure um domínio próprio
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
              Só o responsável ou um admin da empresa pode configurar o domínio.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
