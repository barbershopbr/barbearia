import type { TipoContrato } from "@/lib/supabase/types";

export const CONTRATO_LABEL: Record<TipoContrato, string> = {
  clt: "CLT",
  mei: "MEI / PJ",
  autonomo: "Autônomo",
  parceria: "Parceria (salão-parceiro)",
  estagio: "Estágio / aprendiz",
  outro: "Outro",
};
