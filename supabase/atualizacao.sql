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
