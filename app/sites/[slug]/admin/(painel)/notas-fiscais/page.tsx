import { CheckCircle2, CircleAlert, FileText } from "lucide-react";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { nivelSecao } from "@/lib/auth/papeis";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { blingConfigurado, statusBling } from "@/lib/fiscal/bling";
import { lerConfigFiscal, PASSO_A_PASSO_BLING } from "@/lib/fiscal/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { conectarBling, desconectarBlingEmpresa } from "./actions";
import { ConfigFiscalForm } from "./config-form";

const AVISOS: Record<string, { ok: boolean; texto: string }> = {
  conectado: { ok: true, texto: "Bling conectado! Agora escolha abaixo o que deve gerar nota." },
  cancelado: { ok: false, texto: "Conexão cancelada no Bling." },
  "sem-permissao": { ok: false, texto: "Você não tem permissão para conectar o Bling." },
  erro: { ok: false, texto: "Não foi possível concluir a conexão com o Bling. Tente novamente." },
};

const STATUS_NOTA = { pendente: "Processando", emitida: "Emitida", erro: "Erro", cancelada: "Cancelada" } as const;

export default async function NotasFiscaisPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ bling?: string }>;
}) {
  const { slug } = await params;
  const { bling } = await searchParams;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;
  const staff = await getCurrentStaff(empresa.id);
  const podeEditar = !!staff && nivelSecao(staff, "notas-fiscais") === "editar";

  const status = await statusBling(empresa.id);
  const supabase = await createSupabaseServerClient();
  const [{ data: emitidas }, { data: recebidas }] = await Promise.all([
    supabase.from("notas_fiscais").select("*").eq("empresa_id", empresa.id).order("created_at", { ascending: false }).limit(30),
    // Notas do BarberControl para esta barbearia (mensalidades do sistema).
    supabase.from("notas_fiscais").select("*").eq("empresa_cliente_id", empresa.id).is("empresa_id", null).order("created_at", { ascending: false }).limit(12),
  ]);
  const aviso = bling ? AVISOS[bling] : undefined;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Notas fiscais</h1>
        <p className="text-sm text-muted-foreground">
          Opcional. Conecte o seu Bling para emitir nota dos pagamentos feitos pelo site. As notas saem no CNPJ da barbearia.
        </p>
      </div>

      {aviso && (
        <p
          className={
            aviso.ok
              ? "rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
              : "rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {aviso.texto}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status.conectado && !status.precisaReconectar ? (
              <CheckCircle2 className="size-5 text-emerald-600" />
            ) : (
              <CircleAlert className="size-5 text-amber-500" />
            )}
            Bling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.conectado && !status.precisaReconectar ? (
            <>
              <p className="text-sm">
                Conectado desde {new Date(status.conectadoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.
              </p>
              {podeEditar && <ConfigFiscalForm slug={slug} config={lerConfigFiscal(status.config)} />}
              {podeEditar && (
                <form action={desconectarBlingEmpresa.bind(null, slug)}>
                  <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                    Desconectar Bling
                  </Button>
                </form>
              )}
            </>
          ) : (
            <>
              {status.conectado && status.precisaReconectar && (
                <p className="text-sm text-amber-600">A autorização do Bling expirou. Conecte de novo para voltar a emitir notas.</p>
              )}
              <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                {PASSO_A_PASSO_BLING.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ol>
              {!blingConfigurado() ? (
                <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                  A conexão com o Bling está sendo ativada no BarberControl e fica disponível aqui em breve.
                </p>
              ) : podeEditar ? (
                <form action={conectarBling.bind(null, slug)}>
                  <Button type="submit" size="lg">
                    Conectar Bling
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">Peça ao responsável para conectar o Bling.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notas emitidas pela barbearia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(emitidas ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma nota emitida ainda.</p>
          ) : (
            (emitidas ?? []).map((n) => (
              <div key={n.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm last:border-0">
                <span>
                  {n.tipo.toUpperCase()} {n.numero ? `nº ${n.numero}` : ""} · R$ {Number(n.valor).toFixed(2).replace(".", ",")}
                  <span className="text-muted-foreground"> · {new Date(n.created_at).toLocaleDateString("pt-BR")}</span>
                  {n.erro && <span className="block text-xs text-destructive">{n.erro}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant={n.status === "emitida" ? "default" : n.status === "erro" ? "destructive" : "secondary"}>{STATUS_NOTA[n.status]}</Badge>
                  {n.link_pdf && (
                    <a href={n.link_pdf} target="_blank" rel="noreferrer" className="text-xs underline">
                      PDF
                    </a>
                  )}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {(recebidas ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4" /> Notas do BarberControl (sua assinatura)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(recebidas ?? []).map((n) => (
              <div key={n.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                <span>
                  {n.numero ? `NFS-e nº ${n.numero}` : "NFS-e"} · R$ {Number(n.valor).toFixed(2).replace(".", ",")}
                  <span className="text-muted-foreground"> · {new Date(n.created_at).toLocaleDateString("pt-BR")}</span>
                </span>
                {n.link_pdf && (
                  <a href={n.link_pdf} target="_blank" rel="noreferrer" className="text-xs underline">
                    PDF
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
