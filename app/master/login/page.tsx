import { AuthShell } from "@/components/auth-shell";
import { MasterLoginForm } from "./login-form";

export default function MasterLoginPage() {
  return (
    <AuthShell title="Painel Master" subtitle="BarberControl">
      <MasterLoginForm />
    </AuthShell>
  );
}
