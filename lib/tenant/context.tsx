"use client";

import { createContext, useContext } from "react";
import type { Empresa } from "@/lib/supabase/types";

const TenantContext = createContext<Empresa | null>(null);

export function TenantProvider({
  empresa,
  children,
}: {
  empresa: Empresa;
  children: React.ReactNode;
}) {
  return <TenantContext.Provider value={empresa}>{children}</TenantContext.Provider>;
}

export function useTenant(): Empresa {
  const empresa = useContext(TenantContext);
  if (!empresa) {
    throw new Error("useTenant() só pode ser usado dentro de /sites/[slug] (TenantProvider ausente)");
  }
  return empresa;
}
