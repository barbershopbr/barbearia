import { CheckCircle2, CircleAlert, ShieldCheck } from "lucide-react";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { nivelSecao } from "@/lib/auth/papeis";
import { mercadoPagoConfigurado, statusConexao } from "@/lib/pagamentos/mercadopago";
import { lerPreferencias } from "@/lib/pagamentos/preferencias";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { conectarMercadoPago, desconectarMercadoPago } from "./actions";
import { PreferenciasForm } from "./preferencias-form";

const AVISOS: Record<string, { tipo: "ok" | "erro"; texto: string }> = {
  conectado: { tipo: "ok", texto: "Conta do Mercado Pago conectada! Os pagamentos dos clientes vão cair direto nela." },
  cancelado: { tipo: "erro", texto: "Conexão cancelada no Mercado Pago. Tente de novo quando quiser." },
  "sem-permissao": { tipo: "erro", texto: "Você não tem permissão para conectar a conta de recebimento." },
  erro: { tipo: "erro", texto: "Não foi possível concluir a conexão. Tente novamente em alguns minutos." },
};

const PASSOS = [
  "Clique em \"Conectar Mercado Pago\" aqui embaixo.",
  "Entre na conta do Mercado Pago da barbearia (ou crie uma grátis — pode ser com CPF ou CNPJ).",
  "Confira que é a conta certa e clique em \"Permitir\".",
  "Pronto: você volta para cá e os pagamentos dos clientes já caem na sua conta.",
];

export default async function RecebimentosPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mp?: string }>;
}) {
  const { slug } = await params;
  const { mp } = await searchParams;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;
  const staff = await getCurrentStaff(empresa.id);
  const podeEditar = !!staff && nivelSecao(staff, "pagamentos") === "editar";

  const disponivel = mercadoPagoConfigurado();
  const status = await statusConexao(empresa.id);
  const pref = lerPreferencias(empresa.pagamentos_config);
  const aviso = mp ? AVISOS[mp] : undefined;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Recebimentos</h1>
        <p className="text-sm text-muted-foreground">
          Conecte a conta do Mercado Pago da barbearia para receber Pix, cartão, sinal de agendamento, loja e assinaturas.
          O dinheiro cai direto na sua conta — o BarberControl não tem acesso ao seu saldo.
        </p>
      </div>

      {aviso && (
        <p
          className={
            aviso.tipo === "ok"
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
            {status.conectado ? <CheckCircle2 className="size-5 text-emerald-600" /> : <CircleAlert className="size-5 text-amber-500" />}
            Mercado Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.conectado ? (
            <>
              <p className="text-sm">
                Conectado{status.contaNome ? <> à conta <strong>{status.contaNome}</strong></> : null}
                {status.conectadoEm && (
                  <span className="text-muted-foreground">
                    {" "}
                    desde {new Date(status.conectadoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </span>
                )}
                .
              </p>
              {podeEditar && (
                <form action={desconectarMercadoPago.bind(null, slug)}>
                  <Button type="submit" variant="outline" size="sm">
                    Desconectar esta conta
                  </Button>
                </form>
              )}
            </>
          ) : (
            <>
              <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                {PASSOS.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ol>
              {!disponivel ? (
                <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                  A conexão com o Mercado Pago está sendo ativada no BarberControl e fica disponível aqui em breve.
                </p>
              ) : podeEditar ? (
                <form action={conectarMercadoPago.bind(null, slug)}>
                  <Button type="submit" size="lg" className="bg-[#009ee3] text-white hover:bg-[#0089c7]">
                    Conectar Mercado Pago
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">Peça ao responsável para conectar a conta de recebimento.</p>
              )}
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4" /> Você entra direto no site do Mercado Pago. Não pedimos sua senha.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>O que aceitar</CardTitle>
        </CardHeader>
        <CardContent>
          <PreferenciasForm slug={slug} pref={pref} desabilitado={!podeEditar} />
          {!status.conectado && (
            <p className="mt-3 text-xs text-muted-foreground">
              Essas opções passam a valer no site assim que a conta estiver conectada. Até lá, os clientes pagam na barbearia.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
