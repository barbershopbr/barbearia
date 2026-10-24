"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const BUCKET = "midia";
const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];

/**
 * Sobe uma imagem para o Storage direto do navegador (o arquivo não passa
 * pelo Worker) e devolve a URL pública. Caminho: {empresaId}/{pasta}/{uuid}.ext
 * — a policy do bucket só deixa o staff gravar na pasta da própria empresa.
 */
export async function uploadImagem(file: File, empresaId: string, pasta: string): Promise<string> {
  if (!TIPOS.includes(file.type)) throw new Error("Formato não suportado. Use JPG, PNG, WEBP, GIF, SVG ou ICO.");
  if (file.size > MAX_BYTES) throw new Error("Imagem maior que 5 MB.");

  const ext = (file.name.split(".").pop() || "img").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${empresaId}/${pasta}/${crypto.randomUUID()}.${ext}`;
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "31536000", contentType: file.type });
  if (error) throw new Error("Não foi possível enviar a imagem. Tente de novo.");
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Campo de imagem para formulários: mostra a prévia, envia ao escolher o
 * arquivo e guarda a URL num <input type="hidden" name={name}> — a Server
 * Action do formulário recebe só a URL.
 */
export function ImageUpload({
  name,
  empresaId,
  pasta,
  defaultValue,
  formato = "quadrado",
  onChange,
}: {
  name: string;
  empresaId: string;
  pasta: string;
  defaultValue?: string | null;
  formato?: "quadrado" | "largo" | "redondo";
  onChange?: (url: string) => void;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function definir(novaUrl: string) {
    setUrl(novaUrl);
    onChange?.(novaUrl);
  }

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErro(null);
    setEnviando(true);
    try {
      definir(await uploadImagem(file, empresaId, pasta));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha no envio.");
    } finally {
      setEnviando(false);
    }
  }

  const caixa = cn(
    "relative flex items-center justify-center overflow-hidden border border-dashed border-input bg-muted/40",
    formato === "largo" ? "aspect-[3/1] w-full rounded-lg" : "size-28",
    formato === "redondo" ? "rounded-full" : formato === "quadrado" ? "rounded-lg" : "",
  );

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={url} />
      <input ref={inputRef} type="file" accept={TIPOS.join(",")} className="hidden" onChange={escolher} />
      <div className={caixa}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-6 text-muted-foreground" />
        )}
        {enviando && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" disabled={enviando} onClick={() => inputRef.current?.click()}>
          {url ? "Trocar imagem" : "Enviar imagem"}
        </Button>
        {url && (
          <Button type="button" size="sm" variant="ghost" disabled={enviando} onClick={() => definir("")}>
            <X className="size-4" /> Remover
          </Button>
        )}
      </div>
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}
