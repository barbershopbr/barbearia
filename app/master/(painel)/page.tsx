import Link from "next/link";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { requireMaster } from "@/lib/auth/current-master";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NovaEmpresaDialog } from "./empresa-form";
import { EmpresaStatusSelect } from "./empresa-status-select";
import { tenantOrigin, tenantLabel } from "@/lib/tenant/domain";
import { masterBasePath } from "@/lib/tenant/master-base-path";
import { PLANOS_SAAS } from "@/lib/plano/recursos";

export default async function MasterEmpresasPage() {
  await requireMaster();

  const admin = createSupabaseServiceRoleClient();
  const base = await masterBasePath();
  const { data: empresas } = await admin.from("empresas").select("*").order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Empresas</h1>
        <NovaEmpresaDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Subdomínio</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Criada em</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(empresas ?? []).map((e) => (
            <TableRow key={e.id}>
              <TableCell>
                <Link href={`${base}/empresas/${e.id}`} className="font-medium underline-offset-4 hover:underline">
                  {e.nome}
                </Link>
              </TableCell>
              <TableCell>
                <a
                  href={tenantOrigin(e.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {tenantLabel(e.slug)}
                </a>
              </TableCell>
              <TableCell>{PLANOS_SAAS[e.plano_saas].nome}</TableCell>
              <TableCell>{new Date(e.created_at).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell className="text-right">
                <EmpresaStatusSelect empresaId={e.id} status={e.status} />
              </TableCell>
            </TableRow>
          ))}
          {(!empresas || empresas.length === 0) && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                Nenhuma empresa cadastrada ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
