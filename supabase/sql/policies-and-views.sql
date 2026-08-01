-- Findora database hardening and daily analytics rollup.
-- Run in the Supabase SQL editor after the base tables have been created.

alter table public.sites add column if not exists verification_token text;
alter table public.sites add column if not exists last_verified_at timestamptz;
alter table public.page_views add column if not exists duration_seconds integer not null default 0;

alter table public.clicks enable row level security;
alter table public.page_views enable row level security;
alter table public.conversions enable row level security;
alter table public.campaigns enable row level security;
alter table public.sites enable row level security;

-- Pixels and edge functions may submit events without an authenticated browser.
-- The event endpoints validate campaign/click identifiers; the service key never reaches React.
drop policy if exists "Allow public click ingestion" on public.clicks;
drop policy if exists "Allow public page view ingestion" on public.page_views;
drop policy if exists "Allow public conversion ingestion" on public.conversions;
create policy "Allow public click ingestion" on public.clicks for insert with check (true);
create policy "Allow public page view ingestion" on public.page_views for insert with check (true);
create policy "Allow public conversion ingestion" on public.conversions for insert with check (true);

drop policy if exists "Advertisers read own clicks" on public.clicks;
create policy "Advertisers read own clicks" on public.clicks for select using (
  exists (select 1 from public.campaigns c where c.id = clicks.campaign_id and c.user_id = auth.uid())
);
drop policy if exists "Advertisers read own page views" on public.page_views;
create policy "Advertisers read own page views" on public.page_views for select using (
  exists (
    select 1 from public.clicks cl join public.campaigns c on c.id = cl.campaign_id
    where cl.click_id = page_views.click_id and c.user_id = auth.uid()
  )
);
drop policy if exists "Advertisers read own conversions" on public.conversions;
create policy "Advertisers read own conversions" on public.conversions for select using (
  exists (
    select 1 from public.clicks cl join public.campaigns c on c.id = cl.campaign_id
    where cl.click_id = conversions.click_id and c.user_id = auth.uid()
  )
);

drop policy if exists "Users manage own campaigns" on public.campaigns;
create policy "Users manage own campaigns" on public.campaigns for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage own sites" on public.sites;
create policy "Users manage own sites" on public.sites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- SECURITY INVOKER ensures dashboard reads retain the caller's RLS context.
create or replace view public.statistics with (security_invoker = true) as
select
  c.user_id,
  c.id as campaign_id,
  coalesce(clk.day, pv.day, cv.day)::date as date,
  coalesce(pv.impressions, 0) as impressions,
  coalesce(clk.clicks, 0) as clicks,
  coalesce(cv.conversions, 0) as conversions,
  coalesce(clk.clicks, 0) * 0.50 as cost,
  coalesce(cv.revenue, 0)::numeric as revenue,
  coalesce(pv.sessions, 0) as sessions,
  coalesce(pv.users, 0) as users,
  coalesce(pv.avg_engagement, 0)::numeric as avg_engagement
from public.campaigns c
left join lateral (
  select created_at::date as day, count(*) as clicks
  from public.clicks where campaign_id = c.id group by 1
) clk on true
full join lateral (
  select cl.created_at::date as day, count(*) as impressions,
         count(distinct pv.click_id) as sessions, count(distinct pv.click_id) as users,
         avg(pv.duration_seconds) as avg_engagement
  from public.page_views pv join public.clicks cl on cl.click_id = pv.click_id
  where cl.campaign_id = c.id group by 1
) pv on pv.day = clk.day
full join lateral (
  select cl.created_at::date as day, count(*) as conversions, sum(cv.revenue) as revenue
  from public.conversions cv join public.clicks cl on cl.click_id = cv.click_id
  where cl.campaign_id = c.id group by 1
) cv on cv.day = coalesce(clk.day, pv.day);

create or replace view public.campaign_master_stats with (security_invoker = true) as
select user_id, campaign_id,
  sum(users) as users, sum(sessions) as sessions, sum(impressions) as impressions,
  sum(clicks) as clicks, sum(conversions) as purchases, sum(cost) as cost,
  sum(revenue) as revenue, avg(avg_engagement) as avg_engagement
from public.statistics group by user_id, campaign_id;

grant select on public.statistics, public.campaign_master_stats to authenticated;
