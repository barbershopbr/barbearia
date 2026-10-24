import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { nivelSecao } from "@/lib/auth/papeis";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { alternarPublicacao, responderAvaliacao } from "./actions";

type AvaliacaoLinha = {
  id: string;
  nota: number;
  comentario: string | null;
  resposta: string | null;
  publicada: boolean;
  created_at: string;
  clientes: { nome: string } | null;
  funcionarios: { nome: string } | null;
};

const estrelas = (n: number) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));

export default async function AvaliacoesAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;
  const staff = await getCurrentStaff(empresa.id);
  const podeEditar = !!staff && nivelSecao(staff, "avaliacoes") === "editar";

  const supabase = await createSupabaseServerClient();
  const { data } = (await supabase
    .from("avaliacoes")
    .select("id, nota, comentario, resposta, publicada, created_at, clientes(nome), funcionarios(nome)")
    .eq("empresa_id", empresa.id)
    .order("created_at", { ascending: false })
    .limit(200)) as unknown as { data: AvaliacaoLinha[] | null };
  const lista = data ?? [];

  const media = lista.length ? lista.reduce((s, a) => s + a.nota, 0) / lista.length : 0;
  const porBarbeiro = new Map<string, number[]>();
  for (const a of lista) {
    const nome = a.funcionarios?.nome ?? "—";
    porBarbeiro.set(nome, [...(porBarbeiro.get(nome) ?? []), a.nota]);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Avaliações</h1>
        <p className="text-sm text-muted-foreground">O cliente avalia depois do atendimento concluído. Responda e escolha o que aparece no site.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Média geral</p>
          <p className="text-2xl font-semibold">
            {lista.length ? media.toFixed(1).replace(".", ",") : "—"} <span className="text-base text-amber-500">{lista.length ? estrelas(media) : ""}</span>
          </p>
          <p className="text-xs text-muted-foreground">{lista.length} avaliação(ões)</p>
        </div>
        <div className="rounded-md border p-3 sm:col-span-2">
          <p className="mb-1 text-xs text-muted-foreground">Por profissional</p>
          {[...porBarbeiro.entries()].map(([nome, notas]) => (
            <p key={nome} className="flex justify-between text-sm">
              <span>{nome}</span>
              <span>
                <span className="text-amber-500">{estrelas(notas.reduce((s, n) => s + n, 0) / notas.length)}</span> ({notas.length})
              </span>
            </p>
          ))}
          {porBarbeiro.size === 0 && <p className="text-sm text-muted-foreground">—</p>}
        </div>
      </div>

      <div className="space-y-3">
        {lista.map((a) => (
          <Card key={a.id}>
            <CardContent className="space-y-2 pt-6 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="text-amber-500">{estrelas(a.nota)}</span> · {a.clientes?.nome}
                  {a.funcionarios?.nome ? ` com ${a.funcionarios.nome}` : ""}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  <Badge variant={a.publicada ? "default" : "secondary"}>{a.publicada ? "No site" : "Oculta"}</Badge>
                </span>
              </div>
              {a.comentario && <p>&ldquo;{a.comentario}&rdquo;</p>}
              {podeEditar ? (
                <div className="flex flex-wrap gap-2">
                  <form action={responderAvaliacao.bind(null, a.id)} className="flex min-w-0 flex-1 gap-2">
                    <Input name="resposta" defaultValue={a.resposta ?? ""} placeholder="Responder publicamente (opcional)" className="h-8" maxLength={1000} />
                    <Button type="submit" size="sm" variant="outline">
                      Salvar
                    </Button>
                  </form>
                  <form action={alternarPublicacao.bind(null, a.id, a.publicada)}>
                    <Button type="submit" size="sm" variant="ghost">
                      {a.publicada ? "Ocultar do site" : "Mostrar no site"}
                    </Button>
                  </form>
                </div>
              ) : (
                a.resposta && <p className="border-l-2 pl-2 text-xs text-muted-foreground">Resposta: {a.resposta}</p>
              )}
            </CardContent>
          </Card>
        ))}
        {lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda. Elas aparecem quando os clientes avaliam pelo site.</p>}
      </div>
    </div>
  );
}
