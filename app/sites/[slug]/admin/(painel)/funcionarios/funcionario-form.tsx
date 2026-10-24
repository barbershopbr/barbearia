"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/image-upload";
import type { Funcionario } from "@/lib/supabase/types";
import { salvarFuncionario } from "./actions";

export function FuncionarioDialog({ slug, empresaId, funcionario }: { slug: string; empresaId: string; funcionario?: Funcionario }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await salvarFuncionario(slug, funcionario?.id ?? null, null, formData);
    setPending(false);
    if (result?.error) setError(result.error);
    else setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={funcionario ? <Button size="sm" variant="outline">Editar</Button> : <Button>Novo funcionário</Button>}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{funcionario ? "Editar funcionário" : "Novo funcionário"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Foto</Label>
            <ImageUpload name="foto_url" empresaId={empresaId} pasta="equipe" defaultValue={funcionario?.foto_url} formato="redondo" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" defaultValue={funcionario?.nome} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="especialidades">Especialidades (separadas por vírgula)</Label>
            <Input
              id="especialidades"
              name="especialidades"
              defaultValue={funcionario?.especialidades?.join(", ")}
              placeholder="Corte, Barba, Sobrancelha"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" name="bio" defaultValue={funcionario?.bio ?? ""} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
