import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANOS_SAAS, RECURSO_LABEL, planoMinimo, type Recurso } from "@/lib/plano/recursos";

/** Tela exibida no lugar de uma página do admin cujo recurso não está no plano da barbearia. */
export function RecursoBloqueado({ recurso }: { recurso: Recurso }) {
  const plano = PLANOS_SAAS[planoMinimo(recurso)];
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-4" />
          {RECURSO_LABEL[recurso]}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>
          Este recurso está disponível a partir do plano <strong className="text-foreground">{plano.nome}</strong>{" "}
          (R$ {plano.preco}/mês).
        </p>
        <p>Fale com o suporte do BarberControl para mudar de plano.</p>
      </CardContent>
    </Card>
  );
}
