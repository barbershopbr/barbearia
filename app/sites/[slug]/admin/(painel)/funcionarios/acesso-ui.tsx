"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ITENS_PERMISSAO, PAPEIS_ATRIBUIVEIS, PAPEL_LABEL, type Permissoes } from "@/lib/auth/papeis";
import type { UsuarioEmpresaRole } from "@/lib/supabase/types";
import { alterarPapel, alternarAcessoAtivo, criarAcesso, redefinirSenhaAcesso, salvarPermissoes } from "./acesso-actions";

const SELECT =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const DESCRICAO_PAPEL: Record<string, string> = {
  barbeiro: "Começa com agenda e clientes. Você ajusta depois em Permissões.",
  recepcionista: "Começa com agenda, clientes, pedidos e assinaturas. Ajustável em Permissões.",
  admin: "Vê e edita tudo, inclusive financeiro e configurações.",
};

export function NovoAcessoDialog({ slug, funcionarios }: { slug: string; funcionarios: { id: string; nome: string }[] }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ erro?: string; ok?: string } | null>(null);
  const [nome, setNome] = useState("");
  const [papel, setPapel] = useState<UsuarioEmpresaRole>("barbeiro");

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setMsg(null);
    const r = await criarAcesso(slug, null, formData);
    setPending(false);
    if (r?.error) setMsg({ erro: r.error });
    else {
      setMsg({ ok: r?.success });
      setNome("");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setMsg(null);
      }}
    >
      <DialogTrigger render={<Button>Dar acesso ao painel</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo acesso ao painel</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {funcionarios.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="funcionario_id">Funcionário (opcional)</Label>
              <select
                id="funcionario_id"
                name="funcionario_id"
                className={SELECT}
                defaultValue=""
                onChange={(e) => {
                  const f = funcionarios.find((x) => x.id === e.target.value);
                  if (f) setNome(f.nome);
                }}
              >
                <option value="">Sem vínculo (ex.: recepção)</option>
                {funcionarios.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Vincule para o barbeiro ver a própria agenda e comissões.</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="acesso_nome">Nome</Label>
            <Input id="acesso_nome" name="nome" value={nome} onValueChange={setNome} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="acesso_email">E-mail de login</Label>
              <Input id="acesso_email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acesso_senha">Senha provisória</Label>
              <Input id="acesso_senha" name="password" type="text" minLength={8} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="acesso_papel">Papel</Label>
            <select
              id="acesso_papel"
              name="papel"
              className={SELECT}
              value={papel}
              onChange={(e) => setPapel(e.target.value as UsuarioEmpresaRole)}
            >
              {PAPEIS_ATRIBUIVEIS.map((p) => (
                <option key={p} value={p}>
                  {PAPEL_LABEL[p]}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{DESCRICAO_PAPEL[papel]}</p>
          </div>
          {msg?.erro && <p className="text-sm text-destructive">{msg.erro}</p>}
          {msg?.ok && <p className="text-sm text-emerald-600">{msg.ok}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Criando..." : "Criar acesso"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AcessoAcoes({
  slug,
  usuarioEmpresaId,
  papel,
  ativo,
  permissoes,
}: {
  slug: string;
  usuarioEmpresaId: string;
  papel: UsuarioEmpresaRole;
  ativo: boolean;
  permissoes: Permissoes;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [senhaAberta, setSenhaAberta] = useState(false);
  const [senhaMsg, setSenhaMsg] = useState<{ erro?: string; ok?: string } | null>(null);

  function rodar(acao: () => Promise<{ error?: string } | null>) {
    setErro(null);
    startTransition(async () => {
      const r = await acao();
      if (r?.error) setErro(r.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <select
        aria-label="Papel"
        className={`${SELECT} w-36`}
        defaultValue={papel}
        disabled={pending}
        onChange={(e) => {
          const fd = new FormData();
          fd.set("papel", e.target.value);
          rodar(() => alterarPapel(slug, usuarioEmpresaId, fd));
        }}
      >
        {PAPEIS_ATRIBUIVEIS.map((p) => (
          <option key={p} value={p}>
            {PAPEL_LABEL[p]}
          </option>
        ))}
      </select>

      {papel !== "admin" && <PermissoesDialog slug={slug} usuarioEmpresaId={usuarioEmpresaId} permissoes={permissoes} />}

      <Dialog
        open={senhaAberta}
        onOpenChange={(o) => {
          setSenhaAberta(o);
          if (!o) setSenhaMsg(null);
        }}
      >
        <DialogTrigger render={<Button size="sm" variant="outline">Trocar senha</Button>} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova senha</DialogTitle>
          </DialogHeader>
          <form
            action={async (fd) => {
              const r = await redefinirSenhaAcesso(slug, usuarioEmpresaId, fd);
              setSenhaMsg(r?.error ? { erro: r.error } : { ok: r?.success });
            }}
            className="space-y-3"
          >
            <Input name="password" type="text" minLength={8} placeholder="Mínimo 8 caracteres" required />
            {senhaMsg?.erro && <p className="text-sm text-destructive">{senhaMsg.erro}</p>}
            {senhaMsg?.ok && <p className="text-sm text-emerald-600">{senhaMsg.ok}</p>}
            <Button type="submit" className="w-full">
              Salvar senha
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Button
        size="sm"
        variant={ativo ? "destructive" : "outline"}
        disabled={pending}
        onClick={() => rodar(() => alternarAcessoAtivo(slug, usuarioEmpresaId, ativo))}
      >
        {ativo ? "Bloquear" : "Reativar"}
      </Button>
      {erro && <p className="w-full text-right text-xs text-destructive">{erro}</p>}
    </div>
  );
}

function PermissoesDialog({ slug, usuarioEmpresaId, permissoes }: { slug: string; usuarioEmpresaId: string; permissoes: Permissoes }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ erro?: string; ok?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar(fd: FormData) {
    setMsg(null);
    startTransition(async () => {
      const r = await salvarPermissoes(slug, usuarioEmpresaId, fd);
      setMsg(r?.error ? { erro: r.error } : { ok: r?.success });
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setMsg(null);
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline">Permissões</Button>} />
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>O que esta pessoa pode fazer</DialogTitle>
        </DialogHeader>
        <form action={enviar} className="space-y-3">
          <p className="text-xs text-muted-foreground">&quot;Meu histórico&quot; (próprios atendimentos e comissões) é sempre liberado.</p>
          <div className="divide-y rounded-md border">
            {ITENS_PERMISSAO.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-sm">{s.label}</span>
                <select name={`secao_${s.id}`} defaultValue={permissoes[s.id] ?? ""} className={`${SELECT} w-40`}>
                  <option value="">Sem acesso</option>
                  <option value="ver">Só ver</option>
                  <option value="editar">Ver e editar</option>
                </select>
              </div>
            ))}
          </div>
          {msg?.erro && <p className="text-sm text-destructive">{msg.erro}</p>}
          {msg?.ok && <p className="text-sm text-emerald-600">{msg.ok}</p>}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Salvando..." : "Salvar permissões"}
            </Button>
            <Button type="submit" name="restaurar" value="1" variant="outline" disabled={pending}>
              Padrão do papel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
