-- Test-only billing ledger for Findora advertisers.
-- Run this in the Supabase SQL editor. Replace the test insert flow with a
-- verified Fapshi webhook before accepting real payments.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'XAF' check (currency = 'XAF'),
  status text not null default 'completed' check (status in ('completed', 'pending', 'failed')),
  provider text not null default 'simulation',
  provider_reference text not null unique,
  is_test boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists payments_user_created_at_idx on public.payments (user_id, created_at desc);

alter table public.payments enable row level security;

drop policy if exists "Users read their own payments" on public.payments;
create policy "Users read their own payments" on public.payments
  for select using (auth.uid() = user_id);

-- Test-mode only: remove this policy when real payments are enabled.
drop policy if exists "Users create their own simulated payments" on public.payments;
create policy "Users create their own simulated payments" on public.payments
  for insert with check (
    auth.uid() = user_id
    and is_test = true
    and provider = 'simulation'
    and status = 'completed'
  );
