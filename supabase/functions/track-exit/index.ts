import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  try {
    const { click_id, session_id, duration_seconds, url: pageUrl, page_path } = await req.json();
    if (!click_id || !session_id) return new Response('Missing tracking data', { status: 400, headers: cors });
    const client = createClient(url, key);
    const { data: pageView } = await client.from('page_views').select('id').eq('click_id', click_id).eq('session_id', session_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    const duration = Math.max(0, Math.min(Number(duration_seconds) || 0, 86400));
    // A pagehide beacon may arrive before the initial page-view write. Preserve
    // engagement in that case instead of discarding the entire session.
    const write = pageView
      ? client.from('page_views').update({ duration_seconds: duration }).eq('id', pageView.id)
      : client.from('page_views').insert({ click_id, session_id, url: pageUrl || null, page_path: page_path || null, event_name: 'page_view', duration_seconds: duration, ip_address: req.headers.get('x-forwarded-for') || null, user_agent: req.headers.get('user-agent') || null, referrer: req.headers.get('referer') || null });
    const { error } = await write;
    if (error) throw error;
    return new Response(null, { status: 204, headers: cors });
  } catch (error) { console.error(error); return new Response('Unable to record engagement', { status: 400, headers: cors }); }
});
