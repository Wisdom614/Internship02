-- Findora administrator access and reporting policies.
-- Run simulated-payments.sql first, then run this file in the Supabase SQL editor.
-- Finally, replace the email below with the email address of the account that
-- should administer the platform, then run that INSERT.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Replace the address and run this after that user has registered in Findora.
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'your-admin-email@example.com'
-- on conflict (user_id) do nothing;

drop policy if exists "Administrators read all campaigns" on public.campaigns;
create policy "Administrators read all campaigns" on public.campaigns
  for select using (public.is_admin());
drop policy if exists "Administrators update all campaigns" on public.campaigns;
create policy "Administrators update all campaigns" on public.campaigns
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Administrators read all sites" on public.sites;
create policy "Administrators read all sites" on public.sites
  for select using (public.is_admin());
drop policy if exists "Administrators read all clicks" on public.clicks;
create policy "Administrators read all clicks" on public.clicks
  for select using (public.is_admin());
drop policy if exists "Administrators read all page views" on public.page_views;
create policy "Administrators read all page views" on public.page_views
  for select using (public.is_admin());
drop policy if exists "Administrators read all conversions" on public.conversions;
create policy "Administrators read all conversions" on public.conversions
  for select using (public.is_admin());
drop policy if exists "Administrators read all payments" on public.payments;
create policy "Administrators read all payments" on public.payments
  for select using (public.is_admin());
