import { requireMaster } from "@/lib/auth/current-master";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { blingConfigurado, statusBling, urlRetornoBling } from "@/lib/fiscal/bling";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { conectarBlingMaster, desconectarBlingMaster, salvarConfigBlingMaster } from "./actions";

const AVISOS: Record<string, string> = {
  conectado: "Bling do BarberControl conectado.",
  cancelado: "Conexão cancelada no Bling.",
  "sem-permissao": "Sem permissão.",
  erro: "Não foi possível concluir a conexão com o Bling.",
};

export default async function MasterNotasPage({ searchParams }: { searchParams: Promise<{ bling?: string }> }) {
  await requireMaster();
  const { bling } = await searchParams;
  const status = await statusBling(null);
  const emitirMensalidades = status.conectado && status.config.emitirMensalidades === true;

  const admin = createSupabaseServiceRoleClient();
  const { data: notas } = (await admin
    .from("notas_fiscais")
    .select("id, numero, valor, status, erro, link_pdf, created_at, empresas:empresa_cliente_id(nome)")
    .is("empresa_id", null)
    .order("created_at", { ascending: false })
    .limit(50)) as unknown as {
    data: { id: string; numero: string | null; valor: number; status: string; erro: string | null; link_pdf: string | null; created_at: string; empresas: { nome: string } | null }[] | null;
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Notas fiscais do BarberControl</h1>
        <p className="text-sm text-muted-foreground">NFS-e das mensalidades pagas pelas barbearias, emitidas no Bling do BarberControl.</p>
      </div>

      {bling && AVISOS[bling] && <p className="rounded-md border px-3 py-2 text-sm">{AVISOS[bling]}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Conexão com o Bling</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {!blingConfigurado() ? (
            <div className="space-y-2 text-muted-foreground">
              <p>Para ativar (uma vez só, vale para todas as barbearias também):</p>
              <ol className="list-inside list-decimal space-y-1">
                <li>No Bling do BarberControl: Preferências → Sistema → Usuários, dê ao seu usuário a permissão &quot;Cadastro de aplicativos&quot;.</li>
                <li>Central de Extensões → Área do Integrador → Criar aplicativo.</li>
                <li>
                  Link de redirecionamento: <code className="rounded bg-muted px-1">{urlRetornoBling()}</code>
                </li>
                <li>Escopos: notas fiscais de serviço, notas fiscais, contatos e pedidos de venda.</li>
                <li>Copie o Client Id e o Client Secret e passe para configurar no servidor.</li>
              </ol>
            </div>
          ) : status.conectado ? (
            <>
              <p>
                Conectado desde {new Date(status.conectadoEm).toLocaleDateString("pt-BR")}
                {status.precisaReconectar && <span className="text-amber-600"> — autorização expirada, conecte de novo.</span>}
              </p>
              <form action={salvarConfigBlingMaster} className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="emitir_mensalidades" defaultChecked={emitirMensalidades} className="size-4" />
                  Emitir NFS-e automaticamente a cada mensalidade paga
                </label>
                <Button type="submit" size="sm">
                  Salvar
                </Button>
              </form>
              <form action={desconectarBlingMaster}>
                <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                  Desconectar
                </Button>
              </form>
            </>
          ) : (
            <form action={conectarBlingMaster}>
              <Button type="submit">Conectar Bling do BarberControl</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notas emitidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(notas ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma nota ainda. Elas aparecem aqui quando as mensalidades começarem a ser cobradas.</p>
          ) : (
            (notas ?? []).map((n) => (
              <div key={n.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                <span>
                  {n.empresas?.nome ?? "—"} · {n.numero ? `nº ${n.numero}` : "sem número"} · R$ {Number(n.valor).toFixed(2)}
                  {n.erro && <span className="block text-xs text-destructive">{n.erro}</span>}
                </span>
                <Badge variant={n.status === "emitida" ? "default" : n.status === "erro" ? "destructive" : "secondary"}>{n.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
