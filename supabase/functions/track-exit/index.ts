import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  try {
    const { click_id, session_id, duration_seconds } = await req.json();
    if (!click_id || !session_id) return new Response('Missing tracking data', { status: 400, headers: cors });
    const client = createClient(url, key);
    const { data: pageView } = await client.from('page_views').select('id').eq('click_id', click_id).eq('session_id', session_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!pageView) return new Response('Page view not found', { status: 404, headers: cors });
    const { error } = await client.from('page_views').update({ duration_seconds: Math.max(0, Math.min(Number(duration_seconds) || 0, 86400)) }).eq('id', pageView.id);
    if (error) throw error;
    return new Response(null, { status: 204, headers: cors });
  } catch (error) { console.error(error); return new Response('Unable to record engagement', { status: 400, headers: cors }); }
});
