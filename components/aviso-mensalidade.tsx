import { DIAS_TOLERANCIA_ATRASO, SUPORTE } from "@/lib/plataforma";

const dataBR = (d: string) => d.split("-").reverse().join("/");
const brl = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;

function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
}

/** Faixa no topo do painel (responsável/admin) quando a mensalidade do BarberControl vence em breve ou venceu. */
export function AvisoMensalidade({ fatura, hoje }: { fatura: { valor: number; vencimento: string } | null; hoje: string }) {
  if (!fatura) return null;
  const faltam = diasEntre(hoje, fatura.vencimento);
  if (faltam > 5) return null;

  if (faltam >= 0) {
    return (
      <p className="mb-4 rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-800 dark:text-sky-200">
        A mensalidade do BarberControl ({brl(fatura.valor)}) vence {faltam === 0 ? "hoje" : `em ${dataBR(fatura.vencimento)}`}.
      </p>
    );
  }
  const bloqueiaEm = DIAS_TOLERANCIA_ATRASO + 1 + faltam; // faltam é negativo
  return (
    <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      Mensalidade de {brl(fatura.valor)} venceu em {dataBR(fatura.vencimento)}.{" "}
      {bloqueiaEm > 0 ? `O painel e o site serão bloqueados em ${bloqueiaEm} dia(s) se não for paga.` : "O bloqueio é hoje."} Dúvidas:{" "}
      <a href={`mailto:${SUPORTE.email}`} className="underline">
        {SUPORTE.email}
      </a>
      .
    </p>
  );
}

/** Tela no lugar do painel quando a barbearia está bloqueada. */
export function TelaBloqueio({ motivo, fatura }: { motivo: string | null; fatura: { valor: number; vencimento: string } | null }) {
  return (
    <div className="mx-auto max-w-md space-y-3 py-16 text-center">
      <h1 className="text-xl font-semibold">Acesso bloqueado</h1>
      {motivo === "inadimplencia" ? (
        <p className="text-sm text-muted-foreground">
          A mensalidade do BarberControl
          {fatura ? ` de ${brl(fatura.valor)}, vencida em ${dataBR(fatura.vencimento)},` : ""} está em atraso há mais de {DIAS_TOLERANCIA_ATRASO} dias.
          Assim que o pagamento for confirmado, o painel e o site voltam na hora.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">O acesso desta barbearia foi suspenso.</p>
      )}
      <p className="text-sm">
        Fale com o suporte:{" "}
        <a href={`mailto:${SUPORTE.email}`} className="font-medium underline">
          {SUPORTE.email}
        </a>
      </p>
    </div>
  );
}
