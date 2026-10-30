-- =====================================================================
-- Atualização do banco (para quem JÁ criou as tabelas antes).
-- Cole no Supabase: SQL Editor > New query > Run. Não apaga nenhum dado.
-- =====================================================================

-- Colunas novas
alter table public.messages     add column if not exists actions    text;
alter table public.messages     add column if not exists extras     jsonb;
alter table public.transactions add column if not exists deleted_at timestamptz;
alter table public.transactions add column if not exists edited_at  timestamptz;
alter table public.appointments add column if not exists deleted_at timestamptz;
alter table public.appointments add column if not exists edited_at  timestamptz;
alter table public.notes        add column if not exists deleted_at timestamptz;
alter table public.notes        add column if not exists edited_at  timestamptz;

-- ---------------------------------------------------------------------
-- Conversas (várias, como no app do Claude)
-- Excluir uma conversa apaga SÓ as mensagens dela. Lançamentos e
-- compromissos ficam em outras tabelas e nunca são afetados.
-- ---------------------------------------------------------------------
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  title       text not null default 'Nova conversa'
);

create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

alter table public.messages
  add column if not exists conversation_id uuid references public.conversations (id) on delete cascade;

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);

-- Mensagens antigas (de antes das conversas) viram a "Primeira conversa"
insert into public.conversations (user_id, title, created_at, updated_at)
select m.user_id, 'Primeira conversa', min(m.created_at), max(m.created_at)
  from public.messages m
 where m.conversation_id is null
   and not exists (
     select 1 from public.conversations c
      where c.user_id = m.user_id and c.title = 'Primeira conversa')
 group by m.user_id;

update public.messages m
   set conversation_id = c.id
  from public.conversations c
 where m.conversation_id is null
   and c.user_id = m.user_id
   and c.title = 'Primeira conversa';

-- Segurança: cada um só vê as próprias conversas
alter table public.conversations enable row level security;
drop policy if exists "dono pode ler" on public.conversations;
drop policy if exists "dono pode inserir" on public.conversations;
drop policy if exists "dono pode alterar" on public.conversations;
drop policy if exists "dono pode apagar" on public.conversations;
create policy "dono pode ler" on public.conversations for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "dono pode inserir" on public.conversations for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "dono pode alterar" on public.conversations for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "dono pode apagar" on public.conversations for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- Perfil: nome, cidade e foto (a foto é reduzida no celular antes de salvar)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  name        text,
  city        text,
  avatar      text check (avatar is null or length(avatar) < 400000)
);

-- Informações do perfil completo
alter table public.profiles add column if not exists full_name  text;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists phone      text;
alter table public.profiles add column if not exists state      text;
alter table public.profiles add column if not exists occupation text;
alter table public.profiles add column if not exists bio        text;

alter table public.profiles enable row level security;
drop policy if exists "dono pode ler" on public.profiles;
drop policy if exists "dono pode inserir" on public.profiles;
drop policy if exists "dono pode alterar" on public.profiles;
create policy "dono pode ler" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "dono pode inserir" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "dono pode alterar" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Saldo: o que está na lixeira não conta
create or replace function public.finance_summary(
  p_start    date default null,
  p_end      date default null,
  p_category text default null
)
returns table (income_cents bigint, expense_cents bigint, balance_cents bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(sum(amount_cents) filter (where type = 'income'), 0)::bigint,
    coalesce(sum(amount_cents) filter (where type = 'expense'), 0)::bigint,
    (coalesce(sum(amount_cents) filter (where type = 'income'), 0)
     - coalesce(sum(amount_cents) filter (where type = 'expense'), 0))::bigint
  from public.transactions
  where user_id = (select auth.uid())
    and deleted_at is null
    and (p_start is null or date >= p_start)
    and (p_end is null or date <= p_end)
    and (p_category is null or lower(category) = lower(p_category));
$$;

-- Lixeira: apaga de vez o que está lá há mais de 30 dias
create or replace function public.limpar_lixeira()
returns void
language sql
security invoker
set search_path = public
as $$
  delete from public.transactions
   where user_id = (select auth.uid()) and deleted_at < now() - interval '30 days';
  delete from public.appointments
   where user_id = (select auth.uid()) and deleted_at < now() - interval '30 days';
  delete from public.notes
   where user_id = (select auth.uid()) and deleted_at < now() - interval '30 days';
$$;

revoke all on function public.finance_summary(date, date, text) from public, anon;
grant execute on function public.finance_summary(date, date, text) to authenticated;
revoke all on function public.limpar_lixeira() from public, anon;
grant execute on function public.limpar_lixeira() to authenticated;
