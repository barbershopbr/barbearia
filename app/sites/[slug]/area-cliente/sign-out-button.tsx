"use client";

import { Button } from "@/components/ui/button";
import { signOutCliente } from "./actions";

export function SignOutButton({ slug }: { slug: string }) {
  return (
    <form action={signOutCliente.bind(null, slug)}>
      <Button type="submit" variant="outline" size="sm">
        Sair
      </Button>
    </form>
  );
}
