import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  try {
    const { click_id, session_id, url: pageUrl, page_path } = await req.json();
    if (!click_id || !session_id || !pageUrl) return new Response('Missing tracking data', { status: 400, headers: cors });
    const client = createClient(url, key);
    const { data: click } = await client.from('clicks').select('id').eq('click_id', click_id).maybeSingle();
    if (!click) return new Response('Unknown click', { status: 404, headers: cors });
    const { error } = await client.from('page_views').insert({ click_id, session_id, url: pageUrl, page_path, event_name: 'page_view', ip_address: req.headers.get('x-forwarded-for') || null, user_agent: req.headers.get('user-agent') || null, referrer: req.headers.get('referer') || null });
    if (error) throw error;
    return new Response(null, { status: 204, headers: cors });
  } catch (error) { console.error(error); return new Response('Unable to record page view', { status: 400, headers: cors }); }
});
