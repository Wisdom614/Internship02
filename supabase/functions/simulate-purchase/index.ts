import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://kdncxluglavhsygdxmio.supabase.co';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  try {
    const { click_id, revenue } = await req.json();

    if (!click_id || revenue == null) {
      return new Response('Missing click_id or revenue', { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: clickData, error: checkError } = await supabase
      .from('clicks')
      .select('id')
      .eq('click_id', click_id)
      .single();

    if (checkError || !clickData) {
      console.error('Click not found:', checkError);
      return new Response('Invalid click_id. Click not found.', { status: 404 });
    }

    const { error: insertError } = await supabase
      .from('conversions')
      .insert({
        click_id,
        revenue,
        purchase_id: `SIM_${Date.now()}`
      });

    if (insertError) {
      console.error(insertError);
      return new Response('Error saving conversion', { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, message: `Simulated $${revenue} purchase!` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('simulate-purchase error:', error);
    return new Response('Invalid request', { status: 400, headers: corsHeaders });
  }
});
