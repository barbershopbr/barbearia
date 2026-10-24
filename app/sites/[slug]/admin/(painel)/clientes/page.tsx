import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SEM_EMAIL_SUFIXO } from "@/lib/auth/cliente-identity";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClienteDialog } from "./cliente-form";

export default async function ClientesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q } = await searchParams;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const busca = (q ?? "").trim();
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("clientes").select("*").eq("empresa_id", empresa.id).order("created_at", { ascending: false }).limit(200);
  if (busca) {
    // Escapa os curingas/separadores do filtro "or" do PostgREST.
    const termo = busca.replace(/[%,()]/g, " ");
    query = query.or(`nome.ilike.%${termo}%,email.ilike.%${termo}%,telefone.ilike.%${termo}%`);
  }

  const [{ data: clientes }, { data: concluidos }] = await Promise.all([
    query,
    supabase
      .from("agendamentos")
      .select("cliente_id, data_hora_inicio")
      .eq("empresa_id", empresa.id)
      .eq("status", "concluido"),
  ]);

  const visitas = new Map<string, { total: number; ultima: string }>();
  for (const a of concluidos ?? []) {
    const v = visitas.get(a.cliente_id) ?? { total: 0, ultima: "" };
    v.total += 1;
    if (a.data_hora_inicio > v.ultima) v.ultima = a.data_hora_inicio;
    visitas.set(a.cliente_id, v);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Cadastrados pelo site ou no balcão.</p>
        </div>
        <ClienteDialog slug={slug} />
      </div>

      <form className="max-w-sm">
        <Input name="q" defaultValue={busca} placeholder="Buscar por nome, e-mail ou telefone" />
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Atendimentos</TableHead>
            <TableHead>Última visita</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(clientes ?? []).map((c) => {
            const v = visitas.get(c.id);
            return (
              <TableRow key={c.id}>
                <TableCell>{c.nome}</TableCell>
                <TableCell>{c.email.endsWith(SEM_EMAIL_SUFIXO) ? "—" : c.email}</TableCell>
                <TableCell>{c.telefone || "—"}</TableCell>
                <TableCell>{v?.total ?? 0}</TableCell>
                <TableCell>{v ? new Date(v.ultima).toLocaleDateString("pt-BR") : "—"}</TableCell>
                <TableCell className="text-right">
                  <ClienteDialog slug={slug} cliente={c} />
                </TableCell>
              </TableRow>
            );
          })}
          {(!clientes || clientes.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                {busca ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
