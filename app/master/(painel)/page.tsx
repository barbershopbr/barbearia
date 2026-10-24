import Link from "next/link";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { requireMaster } from "@/lib/auth/current-master";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NovaEmpresaDialog } from "./empresa-form";
import { EmpresaStatusSelect } from "./empresa-status-select";
import { rootDomain } from "@/lib/tenant/domain";

export default async function MasterEmpresasPage() {
  await requireMaster();

  const admin = createSupabaseServiceRoleClient();
  const { data: empresas } = await admin.from("empresas").select("*").order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Empresas</h1>
        <NovaEmpresaDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Subdomínio</TableHead>
            <TableHead>Criada em</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(empresas ?? []).map((e) => (
            <TableRow key={e.id}>
              <TableCell>
                <Link href={`/empresas/${e.id}`} className="font-medium underline-offset-4 hover:underline">
                  {e.nome}
                </Link>
              </TableCell>
              <TableCell>
                <a
                  href={`http://${e.slug}.${rootDomain()}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {e.slug}.{rootDomain()}
                </a>
              </TableCell>
              <TableCell>{new Date(e.created_at).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell className="text-right">
                <EmpresaStatusSelect empresaId={e.id} status={e.status} />
              </TableCell>
            </TableRow>
          ))}
          {(!empresas || empresas.length === 0) && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                Nenhuma empresa cadastrada ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
