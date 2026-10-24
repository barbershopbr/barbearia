import { hojeNoBrasil } from "@/lib/tenant/timezone";

const DATA = /^\d{4}-\d{2}-\d{2}$/;

function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Atalhos de período dos relatórios (datas locais do Brasil). */
export function periodoPadrao(atalho: string | undefined, de: string | undefined, ate: string | undefined): { de: string; ate: string; atalho: string } {
  const hoje = hojeNoBrasil();
  if (de && ate && DATA.test(de) && DATA.test(ate) && de <= ate) return { de, ate, atalho: "personalizado" };
  const inicioMes = `${hoje.slice(0, 7)}-01`;
  switch (atalho) {
    case "mes-passado": {
      const fimAnterior = somarDias(inicioMes, -1);
      return { de: `${fimAnterior.slice(0, 7)}-01`, ate: fimAnterior, atalho };
    }
    case "30d":
      return { de: somarDias(hoje, -29), ate: hoje, atalho };
    case "90d":
      return { de: somarDias(hoje, -89), ate: hoje, atalho };
    default:
      return { de: inicioMes, ate: hoje, atalho: "mes" };
  }
}
