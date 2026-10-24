import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Client com service_role — ignora RLS por completo.
 *
 * Uso restrito a: painel Master (operações cross-tenant) e rotinas internas
 * (ex.: criar conta de cliente com e-mail sintético). NUNCA importar em
 * código que roda no browser nem expor o resultado bruto a um tenant sem
 * antes filtrar por empresa_id explicitamente — este client não tem
 * nenhuma proteção de isolamento embutida.
 */
export function createSupabaseServiceRoleClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
