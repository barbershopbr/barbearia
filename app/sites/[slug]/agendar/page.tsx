import Link from "next/link";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentCliente } from "@/lib/auth/current-cliente";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tenantBasePath } from "@/lib/tenant/base-path";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingForm } from "./booking-form";

export default async function AgendarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
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
  const [{ data: servicos }, { data: funcionarios }] = await Promise.all([
    supabase.from("servicos").select("*").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    supabase.from("funcionarios").select("*").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
  ]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Agendar horário</CardTitle>
        </CardHeader>
        <CardContent>
          {!servicos?.length || !funcionarios?.length ? (
            <p className="text-sm text-muted-foreground">Esta barbearia ainda não cadastrou serviços/profissionais.</p>
          ) : (
            <BookingForm slug={slug} empresaId={empresa.id} servicos={servicos} funcionarios={funcionarios} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
