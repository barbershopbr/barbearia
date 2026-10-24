import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { requireMaster } from "@/lib/auth/current-master";
import { tenantOrigin, tenantLabel } from "@/lib/tenant/domain";
import { masterBasePath } from "@/lib/tenant/master-base-path";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DominioConfigForm } from "@/components/dominio-config-form";
import { EmpresaStatusSelect } from "../../empresa-status-select";
import { EmpresaDetailForm } from "./empresa-detail-form";
import { PlanoForm } from "./plano-form";
import { configurarDominioEmpresa, verificarDominioEmpresa, removerDominioEmpresa } from "./actions";

export default async function EmpresaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMaster();
  const { id } = await params;

  const admin = createSupabaseServiceRoleClient();
  const { data: empresa } = await admin.from("empresas").select("*").eq("id", id).maybeSingle();
  if (!empresa) notFound();

  const [{ count: clientes }, { count: agendamentos }, { count: funcionarios }, { data: concluidos }] =
    await Promise.all([
      admin.from("clientes").select("id", { count: "exact", head: true }).eq("empresa_id", id),
      admin.from("agendamentos").select("id", { count: "exact", head: true }).eq("empresa_id", id),
      admin.from("funcionarios").select("id", { count: "exact", head: true }).eq("empresa_id", id).eq("ativo", true),
      admin
        .from("agendamentos")
        .select("id, servicos(preco)")
        .eq("empresa_id", id)
        .eq("status", "concluido") as unknown as Promise<{ data: { id: string; servicos: { preco: number } | null }[] | null }>,
    ]);

  const receitaEstimada = (concluidos ?? []).reduce((soma, a) => soma + Number(a.servicos?.preco ?? 0), 0);
  const base = await masterBasePath();

  const cards = [
    { label: "Clientes", value: clientes ?? 0 },
    { label: "Agendamentos", value: agendamentos ?? 0 },
    { label: "Funcionários ativos", value: funcionarios ?? 0 },
    { label: "Receita estimada", value: `R$ ${receitaEstimada.toFixed(2)}` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={base === "" ? "/" : base} className="text-xs text-muted-foreground hover:underline">← Empresas</Link>
          <h1 className="font-heading text-xl font-bold tracking-wide uppercase">{empresa.nome}</h1>
          <a
            href={tenantOrigin(empresa.slug)}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted-foreground underline"
          >
            {tenantLabel(empresa.slug)}
          </a>
        </div>
        <EmpresaStatusSelect empresaId={empresa.id} status={empresa.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader>
              <CardTitle className="text-sm font-normal text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Plano do SaaS</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanoForm empresa={empresa} />
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Domínio próprio</CardTitle>
        </CardHeader>
        <CardContent>
          <DominioConfigForm
            dominioPrincipal={empresa.dominio_principal}
            dominioStatus={empresa.dominio_status}
            onConfigurar={configurarDominioEmpresa.bind(null, empresa.id)}
            onVerificar={verificarDominioEmpresa.bind(null, empresa.id)}
            onRemover={removerDominioEmpresa.bind(null, empresa.id)}
          />
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Editar dados</CardTitle>
        </CardHeader>
        <CardContent>
          <EmpresaDetailForm empresa={empresa} />
        </CardContent>
      </Card>
    </div>
  );
}
