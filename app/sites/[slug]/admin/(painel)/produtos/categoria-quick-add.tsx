"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCategoria } from "./actions";

export function CategoriaQuickAdd({ slug }: { slug: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createCategoria(slug, null, formData);
    setPending(false);
    if (result?.error) setError(result.error);
  }

  return (
    <form action={handleSubmit} className="flex items-start gap-2">
      <div>
        <Input name="nome" placeholder="Nova categoria" className="h-8 w-40" required />
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "..." : "Adicionar"}
      </Button>
    </form>
  );
}
