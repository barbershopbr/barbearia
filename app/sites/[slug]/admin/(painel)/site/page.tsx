import { ExternalLink } from "lucide-react";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tenantOrigin } from "@/lib/tenant/domain";
import { lerSiteConfig } from "@/lib/site/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AparenciaForm } from "./aparencia-form";
import { GaleriaManager } from "./galeria-manager";
import { PromocaoDialog } from "./promocao-form";
import { togglePromocaoAtiva, removerPromocao } from "./actions";

export default async function AparenciaSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const staff = await getCurrentStaff(empresa.id);
  const podeEditar = staff && (staff.role === "owner" || staff.role === "admin");

  const supabase = await createSupabaseServerClient();
  const [{ data: fotos }, { data: promocoes }] = await Promise.all([
    supabase.from("galeria_fotos").select("*").eq("empresa_id", empresa.id).order("ordem").order("created_at"),
    supabase.from("promocoes").select("*").eq("empresa_id", empresa.id).order("ordem").order("created_at"),
  ]);

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Aparência do site</h1>
          <p className="text-sm text-muted-foreground">Tema, logo, fotos, cores, textos e seções da página inicial. As mudanças aparecem na hora.</p>
        </div>
        <Button
          variant="outline"
          render={
            <a href={tenantOrigin(slug)} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> Ver site
            </a>
          }
        />
      </div>

      {!podeEditar ? (
        <p className="text-sm text-muted-foreground">Só o responsável ou um admin da empresa pode alterar o site.</p>
      ) : (
        <>
          <AparenciaForm empresa={empresa} config={lerSiteConfig(empresa.site_config)} />

          <Card>
            <CardHeader>
              <CardTitle>Galeria de fotos</CardTitle>
            </CardHeader>
            <CardContent>
              <GaleriaManager slug={slug} empresaId={empresa.id} fotos={fotos ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Promoções em destaque</CardTitle>
              <PromocaoDialog slug={slug} empresaId={empresa.id} />
            </CardHeader>
            <CardContent className="space-y-3">
              {(promocoes ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma promoção. Elas aparecem no topo do site, logo depois da capa.</p>
              )}
              {(promocoes ?? []).map((p) => {
                const expirada = !!p.validade && p.validade < hoje;
                return (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
                    {p.imagem_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imagem_url} alt="" className="h-12 w-20 rounded object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.preco_por != null && `R$ ${Number(p.preco_por).toFixed(2)}`}
                        {p.validade && ` · até ${p.validade.split("-").reverse().join("/")}`}
                      </p>
                    </div>
                    <Badge variant={p.ativo && !expirada ? "default" : "secondary"}>
                      {expirada ? "Expirada" : p.ativo ? "No site" : "Oculta"}
                    </Badge>
                    <PromocaoDialog slug={slug} empresaId={empresa.id} promocao={p} />
                    <form action={togglePromocaoAtiva.bind(null, p.id, p.ativo)}>
                      <Button type="submit" size="sm" variant="outline">{p.ativo ? "Ocultar" : "Mostrar"}</Button>
                    </form>
                    <form action={removerPromocao.bind(null, p.id)}>
                      <Button type="submit" size="sm" variant="destructive">Excluir</Button>
                    </form>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
