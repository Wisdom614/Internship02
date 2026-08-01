-- Findora production tracking upgrade.
-- Run after policies-and-views.sql in the Supabase SQL editor.

alter table public.page_views add column if not exists session_id text;
alter table public.page_views add column if not exists page_path text;
alter table public.page_views add column if not exists event_name text not null default 'page_view';

create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  click_id uuid not null,
  session_id text,
  event_name text not null,
  page_url text,
  value numeric,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists page_views_click_session_idx on public.page_views (click_id, session_id, created_at desc);
create index if not exists tracking_events_click_idx on public.tracking_events (click_id, created_at desc);
alter table public.tracking_events enable row level security;
drop policy if exists "Advertisers read own tracking events" on public.tracking_events;
create policy "Advertisers read own tracking events" on public.tracking_events for select using (
  exists (select 1 from public.clicks cl join public.campaigns c on c.id = cl.campaign_id where cl.click_id = tracking_events.click_id and c.user_id = auth.uid())
);

-- Keep rollups tied to actual tracked visits. A session is one browser visit, page views
-- are every route tracked by the pixel, and engagement is the total recorded time per session.
create or replace view public.statistics with (security_invoker = true) as
with days as (
  select campaign_id, created_at::date as day from public.clicks
  union select cl.campaign_id, pv.created_at::date from public.page_views pv join public.clicks cl on cl.click_id = pv.click_id
  union select cl.campaign_id, cv.created_at::date from public.conversions cv join public.clicks cl on cl.click_id = cv.click_id
), click_rollup as (
  select campaign_id, created_at::date as day, count(*) as clicks from public.clicks group by 1, 2
), visit_rollup as (
  select cl.campaign_id, pv.created_at::date as day,
    count(*) filter (where pv.event_name = 'page_view') as impressions,
    count(distinct coalesce(pv.session_id, pv.click_id::text)) as sessions,
    count(distinct coalesce(pv.session_id, pv.click_id::text)) as users,
    coalesce(sum(pv.duration_seconds), 0)::numeric / nullif(count(distinct coalesce(pv.session_id, pv.click_id::text)), 0) as avg_engagement
  from public.page_views pv join public.clicks cl on cl.click_id = pv.click_id group by 1, 2
), conversion_rollup as (
  select cl.campaign_id, cv.created_at::date as day, count(*) as conversions, coalesce(sum(cv.revenue), 0) as revenue
  from public.conversions cv join public.clicks cl on cl.click_id = cv.click_id group by 1, 2
)
select c.user_id, d.campaign_id, d.day as date,
  coalesce(v.impressions, 0) as impressions, coalesce(k.clicks, 0) as clicks,
  coalesce(cv.conversions, 0) as conversions, coalesce(k.clicks, 0) * .50 as cost,
  coalesce(cv.revenue, 0)::numeric as revenue, coalesce(v.sessions, 0) as sessions,
  coalesce(v.users, 0) as users, coalesce(v.avg_engagement, 0)::numeric as avg_engagement
from days d join public.campaigns c on c.id = d.campaign_id
left join click_rollup k on k.campaign_id = d.campaign_id and k.day = d.day
left join visit_rollup v on v.campaign_id = d.campaign_id and v.day = d.day
left join conversion_rollup cv on cv.campaign_id = d.campaign_id and cv.day = d.day;

create or replace view public.campaign_master_stats with (security_invoker = true) as
select user_id, campaign_id, sum(users) as users, sum(sessions) as sessions, sum(impressions) as impressions,
  sum(clicks) as clicks, sum(conversions) as purchases, sum(cost) as cost, sum(revenue) as revenue,
  case when sum(sessions) > 0 then sum(avg_engagement * sessions) / sum(sessions) else 0 end as avg_engagement
from public.statistics group by user_id, campaign_id;

grant select on public.statistics, public.campaign_master_stats to authenticated;
