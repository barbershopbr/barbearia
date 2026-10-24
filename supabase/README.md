# Banco de dados (Supabase)

## Aplicar as migrations

Opção mais simples (sem instalar nada): crie um projeto em https://supabase.com,
abra o **SQL Editor** e execute **todos** os arquivos de `migrations/`, na
ordem do prefixo de data no nome do arquivo (mais antigo primeiro).

Alternativa via CLI (`npm install -g supabase`, depois `supabase link` e
`supabase db push`) se preferir versionar isso com o projeto remoto.

Depois, copie `.env.local.example` para `.env.local` e preencha com os valores
de Project Settings > API do seu projeto Supabase.

## Criar o primeiro admin do painel Master

Não dá para automatizar isso numa migration porque precisa de um
`auth.users` real. Depois de aplicar as migrations:

1. No dashboard do Supabase, em Authentication > Users, crie um usuário
   (e-mail/senha) para você mesmo.
2. No SQL Editor, rode substituindo o e-mail:

   ```sql
   insert into master_admins (auth_user_id, nome, role)
   select id, 'Seu Nome', 'admin'
   from auth.users
   where email = 'seu-email@exemplo.com';
   ```

3. Esse usuário já pode logar em `/master` (ou `master.lvh.me:3000` em dev).

## Por que os clientes usam um e-mail "sintético" no Supabase Auth

Cada barbearia exige cadastro de cliente 100% independente — o mesmo e-mail
real pode criar contas separadas em barbearias diferentes, cada uma com sua
própria senha. Como `auth.users.email` é único globalmente no projeto
Supabase, o e-mail realmente usado para autenticar é gerado a partir de
`empresa_id + e-mail real` (ver `lib/auth/cliente-identity.ts`). O e-mail
digitado pelo cliente fica salvo em `clientes.email` e é o único usado para
qualquer comunicação (nunca o sintético).
