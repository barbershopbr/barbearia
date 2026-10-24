import Link from "next/link";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentCliente } from "@/lib/auth/current-cliente";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tenantBasePath } from "@/lib/tenant/base-path";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingForm } from "./booking-form";
import { clientePodeAlterar } from "@/lib/agenda/regras-cliente";

export default async function AgendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ remarcar?: string; barbeiro?: string; servico?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const cliente = await getCurrentCliente(empresa.id);

  if (!cliente) {
    const base = await tenantBasePath(slug);
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>Entre para agendar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Você precisa de uma conta em {empresa.nome} para agendar um horário.</p>
            <div className="flex gap-2">
              <Button className="flex-1" render={<Link href={`${base}/area-cliente/login`}>Entrar</Link>} />
              <Button variant="outline" className="flex-1" render={<Link href={`${base}/area-cliente/cadastro`}>Criar conta</Link>} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: servicos }, { data: funcionarios }, { data: remarcando }] = await Promise.all([
    supabase.from("servicos").select("*").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    supabase.from("funcionarios").select("*").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    query.remarcar
      ? (supabase
          .from("agendamentos")
          .select("id, status, data_hora_inicio, servico_id, funcionario_id, servicos(nome)")
          .eq("id", query.remarcar)
          .eq("cliente_id", cliente.id)
          .maybeSingle() as unknown as Promise<{
          data: { id: string; status: string; data_hora_inicio: string; servico_id: string; funcionario_id: string; servicos: { nome: string } | null } | null;
        }>)
      : Promise.resolve({ data: null }),
  ]);

  const remarcavel = remarcando && clientePodeAlterar(remarcando) ? remarcando : null;
  const inicial = remarcavel
    ? { servicoId: remarcavel.servico_id, funcionarioId: remarcavel.funcionario_id }
    : { servicoId: query.servico, funcionarioId: query.barbeiro };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{remarcavel ? "Remarcar horário" : "Agendar horário"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {remarcavel && (
            <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
              Remarcando <strong className="text-foreground">{remarcavel.servicos?.nome}</strong> de{" "}
              {new Date(remarcavel.data_hora_inicio).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}.
              O horário antigo é liberado quando você confirmar o novo.
            </p>
          )}
          {remarcando && !remarcavel && (
            <p className="rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive">
              Esse agendamento não pode mais ser remarcado pelo site. Fale com a barbearia.
            </p>
          )}
          {!servicos?.length || !funcionarios?.length ? (
            <p className="text-sm text-muted-foreground">Esta barbearia ainda não cadastrou serviços/profissionais.</p>
          ) : (
            <BookingForm
              slug={slug}
              empresaId={empresa.id}
              servicos={servicos}
              funcionarios={funcionarios}
              inicial={inicial}
              remarcarId={remarcavel?.id}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
