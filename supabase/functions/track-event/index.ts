import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const allowedEvents = new Set(['purchase', 'add_to_cart', 'lead', 'signup', 'custom']);

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  try {
    const { click_id, session_id, event_name, url: pageUrl, value, event_data } = await req.json();
    if (!click_id || !session_id || !allowedEvents.has(event_name)) return new Response('Invalid event', { status: 400, headers: cors });
    const client = createClient(url, key);
    const { data: click } = await client.from('clicks').select('id').eq('click_id', click_id).maybeSingle();
    if (!click) return new Response('Unknown click', { status: 404, headers: cors });
    const { error } = await client.from('tracking_events').insert({ click_id, session_id, event_name, page_url: pageUrl || null, value: Number.isFinite(Number(value)) ? Number(value) : null, event_data: event_data || {} });
    if (error) throw error;
    if (event_name === 'purchase') {
      const purchaseId = event_data?.purchase_id || `PIXEL_${crypto.randomUUID()}`;
      const conversion = await client.from('conversions').upsert({ click_id, revenue: Number(value) || 0, purchase_id: String(purchaseId) }, { onConflict: 'purchase_id', ignoreDuplicates: true });
      if (conversion.error) throw conversion.error;
    }
    return new Response(null, { status: 204, headers: cors });
  } catch (error) { console.error(error); return new Response('Unable to record event', { status: 400, headers: cors }); }
});
