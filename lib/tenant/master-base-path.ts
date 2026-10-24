import { headers } from "next/headers";
import { resolveHost } from "@/lib/tenant/domain";

/** Mesma lógica de tenantBasePath, mas para o painel Master (subdomínio "master"/"admin" vs. caminho "/master"). */
export async function masterBasePath(): Promise<string> {
  const host = (await headers()).get("host");
  const { kind } = await resolveHost(host);
  return kind === "master" ? "" : "/master";
}
