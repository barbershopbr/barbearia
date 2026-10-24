import Link from "next/link";
import { Scissors } from "lucide-react";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { tenantBasePath } from "@/lib/tenant/base-path";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function EntrarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const base = await tenantBasePath(slug);

  return (
    <div className="grain flex min-h-screen items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-white">
          <div className="badge-emblem h-14 w-14 border-white/70 text-white">
            <Scissors className="size-6" strokeWidth={1.5} />
          </div>
          <p className="text-xs tracking-[0.3em] text-white/50 uppercase">{empresa.nome}</p>
        </div>
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-xl tracking-wide uppercase">Entrar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" render={<Link href={`${base}/area-cliente/login`}>Sou cliente</Link>} />
            <Button variant="outline" className="w-full" render={<Link href={`${base}/admin/login`}>Sou funcionário / barbeiro</Link>} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
