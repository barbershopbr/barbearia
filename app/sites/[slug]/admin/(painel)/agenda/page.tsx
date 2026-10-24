import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { escopoAgenda } from "@/lib/auth/agenda-escopo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { brazilDayRangeUtc, hojeNoBrasil } from "@/lib/tenant/timezone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NovoAgendamentoDialog } from "./agendamento-form";
import { StatusSelect } from "./status-select";
import { BloqueioDialog } from "./bloqueio-form";
import { removerBloqueio } from "./bloqueio-actions";
import type { AgendamentoStatus } from "@/lib/supabase/types";

type AgendamentoLinha = {
  id: string;
  data_hora_inicio: string;
  status: AgendamentoStatus;
  funcionario_id: string;
  clientes: { nome: string; telefone: string | null } | null;
  servicos: { nome: string; preco: number } | null;
  funcionarios: { nome: string } | null;
};

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export default async function AgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ dia?: string; prof?: string }>;
}) {
  const { slug } = await params;
  const filtros = await searchParams;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;
  const staff = await getCurrentStaff(empresa.id);
  if (!staff) return null;

  const escopo = await escopoAgenda(staff);
  const hoje = hojeNoBrasil();
  const dia = filtros.dia && DATA_REGEX.test(filtros.dia) ? filtros.dia : hoje;
  const { inicio, fim } = brazilDayRangeUtc(dia);

  // Quem só vê a própria agenda ignora o filtro de profissional da URL.
  const profissional = escopo.tipo === "propria" ? escopo.funcionarioId : filtros.prof || null;

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("agendamentos")
    .select("id, data_hora_inicio, status, funcionario_id, clientes(nome, telefone), servicos(nome, preco), funcionarios(nome)")
    .eq("empresa_id", empresa.id)
    .gte("data_hora_inicio", inicio.toISOString())
    .lte("data_hora_inicio", fim.toISOString())
    .order("data_hora_inicio");
  if (profissional) query = query.eq("funcionario_id", profissional);

  const [{ data: agendamentosRaw }, { data: clientes }, { data: servicos }, { data: funcionarios }, { data: bloqueios }] = await Promise.all([
    query as unknown as Promise<{ data: AgendamentoLinha[] | null }>,
    supabase.from("clientes").select("*").eq("empresa_id", empresa.id).order("nome"),
    supabase.from("servicos").select("*").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    supabase.from("funcionarios").select("*").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    // Bloqueios a partir do dia exibido (folgas futuras ficam visíveis para a equipe toda).
    supabase
      .from("bloqueios_agenda")
      .select("*")
      .eq("empresa_id", empresa.id)
      .gte("fim", inicio.toISOString())
      .order("inicio")
      .limit(30),
  ]);
  const { data: espera } = (await supabase
    .from("lista_espera")
    .select("id, status, clientes(nome, telefone), servicos(nome), funcionarios(nome)")
    .eq("empresa_id", empresa.id)
    .eq("data", dia)
    .in("status", ["aguardando", "avisado"])
    .order("created_at")) as unknown as {
    data: { id: string; status: string; clientes: { nome: string; telefone: string | null } | null; servicos: { nome: string } | null; funcionarios: { nome: string } | null }[] | null;
  };
  const nomeProfissional = new Map((funcionarios ?? []).map((f) => [f.id, f.nome]));
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

  const semPerfil = escopo.tipo === "propria" && !escopo.funcionarioId;
  const agendamentos = semPerfil ? [] : (agendamentosRaw ?? []);
  const profissionaisAgendaveis =
    escopo.tipo === "propria"
      ? (funcionarios ?? []).filter((f) => f.id === escopo.funcionarioId)
      : escopo.podeEditarEquipe
        ? (funcionarios ?? [])
        : [];
  const previsto = agendamentos
    .filter((a) => a.status !== "cancelado" && a.status !== "falta")
    .reduce((s, a) => s + Number(a.servicos?.preco ?? 0), 0);
  const qs = (d: string) => `?dia=${d}${filtros.prof && escopo.tipo === "equipe" ? `&prof=${filtros.prof}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            {escopo.tipo === "propria" ? "Seus atendimentos." : "Atendimentos de toda a equipe."}
          </p>
        </div>
        <div className="flex gap-2">
          {profissionaisAgendaveis.length > 0 && (
            <BloqueioDialog
              slug={slug}
              profissionais={profissionaisAgendaveis.map((f) => ({ id: f.id, nome: f.nome }))}
              permiteBarbeariaToda={escopo.tipo === "equipe" && escopo.podeEditarEquipe}
              diaInicial={dia}
            />
          )}
          {profissionaisAgendaveis.length > 0 && (
            <NovoAgendamentoDialog slug={slug} clientes={clientes ?? []} servicos={servicos ?? []} funcionarios={profissionaisAgendaveis} />
          )}
        </div>
      </div>

      {semPerfil && (
        <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
          Seu acesso ainda não está vinculado a um perfil de profissional. Peça ao responsável para vincular em Funcionários.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="icon-sm" variant="outline" aria-label="Dia anterior" render={<Link href={qs(somarDias(dia, -1))}><ChevronLeft className="size-4" /></Link>} />
        <form className="flex flex-wrap items-center gap-2">
          <Input type="date" name="dia" defaultValue={dia} className="w-40" />
          {escopo.tipo === "equipe" && (
            <select
              name="prof"
              defaultValue={filtros.prof ?? ""}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              aria-label="Profissional"
            >
              <option value="">Todos os profissionais</option>
              {(funcionarios ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          )}
          <Button type="submit" size="sm" variant="outline">
            Filtrar
          </Button>
        </form>
        <Button size="icon-sm" variant="outline" aria-label="Próximo dia" render={<Link href={qs(somarDias(dia, 1))}><ChevronRight className="size-4" /></Link>} />
        {dia !== hoje && (
          <Button size="sm" variant="ghost" render={<Link href={qs(hoje)}>Hoje</Link>} />
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {agendamentos.length} atendimento(s) · previsto R$ {previsto.toFixed(2).replace(".", ",")}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Horário</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Serviço</TableHead>
            <TableHead>Profissional</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agendamentos.map((a) => {
            const editavel =
              escopo.tipo === "equipe" ? escopo.podeEditarEquipe : escopo.funcionarioId === a.funcionario_id;
            return (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  {new Date(a.data_hora_inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
                </TableCell>
                <TableCell>
                  {a.clientes?.nome}
                  {a.clientes?.telefone && <span className="block text-xs text-muted-foreground">{a.clientes.telefone}</span>}
                </TableCell>
                <TableCell>{a.servicos?.nome}</TableCell>
                <TableCell>{a.funcionarios?.nome}</TableCell>
                <TableCell className="text-right">
                  {editavel ? <StatusSelect agendamentoId={a.id} status={a.status} /> : <span className="text-sm">{a.status}</span>}
                </TableCell>
              </TableRow>
            );
          })}
          {agendamentos.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                Nenhum atendimento neste dia.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {(espera ?? []).length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Lista de espera deste dia ({(espera ?? []).length})</h2>
          <div className="divide-y rounded-md border text-sm">
            {(espera ?? []).map((e) => (
              <div key={e.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                <span>
                  {e.clientes?.nome}
                  {e.clientes?.telefone ? ` · ${e.clientes.telefone}` : ""} · {e.servicos?.nome}
                  {e.funcionarios?.nome ? ` com ${e.funcionarios.nome}` : " (qualquer profissional)"}
                </span>
                <span className="text-xs text-muted-foreground">{e.status === "avisado" ? "avisado por e-mail" : "aguardando vaga"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(bloqueios ?? []).length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Folgas e bloqueios</h2>
          <div className="divide-y rounded-md border">
            {(bloqueios ?? []).map((b) => {
              const podeRemover =
                b.funcionario_id === null
                  ? escopo.tipo === "equipe" && escopo.podeEditarEquipe
                  : escopo.tipo === "equipe"
                    ? escopo.podeEditarEquipe
                    : escopo.funcionarioId === b.funcionario_id;
              return (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">{b.funcionario_id ? (nomeProfissional.get(b.funcionario_id) ?? "Profissional") : "Barbearia inteira"}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {fmt(b.inicio)} até {fmt(b.fim)}
                      {b.motivo ? ` · ${b.motivo}` : ""}
                    </span>
                  </div>
                  {podeRemover && (
                    <form action={removerBloqueio.bind(null, b.id)}>
                      <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                        Remover
                      </Button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
