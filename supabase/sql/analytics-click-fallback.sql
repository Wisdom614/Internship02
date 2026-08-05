-- Run this after tracking-upgrade.sql. A redirect click is treated as a campaign
-- arrival until the destination-site pixel supplies richer visit data.
create or replace view public.statistics with (security_invoker = true) as
with days as (
  select campaign_id, created_at::date as day from public.clicks
  union select cl.campaign_id, pv.created_at::date from public.page_views pv join public.clicks cl on cl.click_id = pv.click_id
  union select cl.campaign_id, cv.created_at::date from public.conversions cv join public.clicks cl on cl.click_id = cv.click_id
), clicks_by_day as (
  select campaign_id, created_at::date as day, count(*) as clicks from public.clicks group by 1, 2
), visits_by_day as (
  select cl.campaign_id, pv.created_at::date as day, count(*) filter (where pv.event_name = 'page_view') as impressions,
    count(distinct coalesce(pv.session_id, pv.click_id::text)) as sessions, count(distinct coalesce(pv.session_id, pv.click_id::text)) as users,
    coalesce(sum(pv.duration_seconds), 0)::numeric / nullif(count(distinct coalesce(pv.session_id, pv.click_id::text)), 0) as avg_engagement
  from public.page_views pv join public.clicks cl on cl.click_id = pv.click_id group by 1, 2
), conversions_by_day as (
  select cl.campaign_id, cv.created_at::date as day, count(*) as conversions, coalesce(sum(cv.revenue), 0) as revenue
  from public.conversions cv join public.clicks cl on cl.click_id = cv.click_id group by 1, 2
)
select c.user_id, d.campaign_id, d.day as date, greatest(coalesce(v.impressions, 0), coalesce(k.clicks, 0)) as impressions,
  coalesce(k.clicks, 0) as clicks, coalesce(cv.conversions, 0) as conversions, coalesce(k.clicks, 0) * .50 as cost,
  coalesce(cv.revenue, 0)::numeric as revenue, greatest(coalesce(v.sessions, 0), coalesce(k.clicks, 0)) as sessions,
  greatest(coalesce(v.users, 0), coalesce(k.clicks, 0)) as users, coalesce(v.avg_engagement, 0)::numeric as avg_engagement
from days d join public.campaigns c on c.id = d.campaign_id
left join clicks_by_day k on k.campaign_id = d.campaign_id and k.day = d.day
left join visits_by_day v on v.campaign_id = d.campaign_id and v.day = d.day
left join conversions_by_day cv on cv.campaign_id = d.campaign_id and cv.day = d.day;

create or replace view public.campaign_master_stats with (security_invoker = true) as
select user_id, campaign_id, sum(users) as users, sum(sessions) as sessions, sum(impressions) as impressions, sum(clicks) as clicks,
  sum(conversions) as purchases, sum(cost) as cost, sum(revenue) as revenue,
  case when sum(sessions) > 0 then sum(avg_engagement * sessions) / sum(sessions) else 0 end as avg_engagement
from public.statistics group by user_id, campaign_id;

grant select on public.statistics, public.campaign_master_stats to authenticated;
