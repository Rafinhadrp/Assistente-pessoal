-- =====================================================================
-- Assistente Pessoal - estrutura do banco (Fase 1)
-- Cole TODO este arquivo no Supabase: SQL Editor > New query > Run.
-- Pode rodar de novo sem problema (ele não apaga seus dados).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Lançamentos financeiros (receitas e gastos)
-- Valores SEMPRE em centavos (inteiro): R$ 35,90 = 3590
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  type          text not null check (type in ('income', 'expense')),
  amount_cents  bigint not null check (amount_cents > 0),
  category      text not null default 'outros',
  description   text not null default '',
  date          date not null default (now() at time zone 'America/Sao_Paulo')::date
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);

-- ---------------------------------------------------------------------
-- Compromissos
-- ---------------------------------------------------------------------
create table if not exists public.appointments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  title       text not null,
  category    text not null default 'outros'
              check (category in ('saude', 'pessoal', 'trabalho', 'outros')),
  starts_at   timestamptz not null,
  status      text not null default 'pending'
              check (status in ('pending', 'done', 'archived')),
  notes       text
);

create index if not exists appointments_user_starts_idx
  on public.appointments (user_id, starts_at);

-- ---------------------------------------------------------------------
-- Notas (usada a partir da Fase 4, mas já fica criada)
-- ---------------------------------------------------------------------
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  title       text not null,
  content     text not null default '',
  category    text not null default 'outros'
);

create index if not exists notes_user_created_idx
  on public.notes (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Histórico do chat
-- ---------------------------------------------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  role        text not null check (role in ('user', 'assistant')),
  content     text not null
);

create index if not exists messages_user_created_idx
  on public.messages (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Segurança (RLS): cada usuário só enxerga e mexe nos PRÓPRIOS dados
-- ---------------------------------------------------------------------
alter table public.transactions enable row level security;
alter table public.appointments enable row level security;
alter table public.notes        enable row level security;
alter table public.messages     enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['transactions', 'appointments', 'notes', 'messages'] loop
    execute format('drop policy if exists "dono pode ler" on public.%I', t);
    execute format('drop policy if exists "dono pode inserir" on public.%I', t);
    execute format('drop policy if exists "dono pode alterar" on public.%I', t);
    execute format('drop policy if exists "dono pode apagar" on public.%I', t);

    execute format(
      'create policy "dono pode ler" on public.%I for select to authenticated
         using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "dono pode inserir" on public.%I for insert to authenticated
         with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "dono pode alterar" on public.%I for update to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "dono pode apagar" on public.%I for delete to authenticated
         using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Resumo financeiro: as contas são feitas AQUI (no banco), nunca pela IA.
-- Todos os parâmetros são opcionais (null = sem filtro).
-- "security invoker" = respeita o RLS de quem chama.
-- ---------------------------------------------------------------------
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
    and (p_start is null or date >= p_start)
    and (p_end is null or date <= p_end)
    and (p_category is null or lower(category) = lower(p_category));
$$;

revoke all on function public.finance_summary(date, date, text) from public, anon;
grant execute on function public.finance_summary(date, date, text) to authenticated;

-- =====================================================================
-- Atualização (Fase 2.1): o histórico do chat passa a guardar o que o
-- sistema realmente fez em cada resposta (ex: "compromisso criado").
-- Assim a IA não acha que esqueceu de salvar e não cria duplicado.
-- =====================================================================
alter table public.messages add column if not exists actions text;
