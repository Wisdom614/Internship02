import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://kdncxluglavhsygdxmio.supabase.co';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const campaignId = url.searchParams.get('cid');

    if (!campaignId) {
      return new Response('Missing campaign ID (cid)', { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('status, sites(url, verified)')
      .eq('id', campaignId)
      .single();

    if (error || !campaign) {
      return new Response('Campaign not found', { status: 404 });
    }

    if (campaign.status !== 'active' || !campaign.sites?.verified) {
      return new Response('Campaign is not active or site is not verified', { status: 403 });
    }

    const destinationUrl = campaign.sites.url;
    if (!destinationUrl) {
      return new Response('Destination URL not configured', { status: 400 });
    }

    const clickId = crypto.randomUUID();
    const { error: insertError } = await supabase
      .from('clicks')
      .insert({
        campaign_id: campaignId,
        click_id: clickId,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
        user_agent: req.headers.get('user-agent') || null,
        referrer: req.headers.get('referer') || null,
      });

    if (insertError) {
      console.error('Failed to insert click:', insertError);
      return new Response('Error logging click', { status: 500 });
    }

    const destination = new URL(destinationUrl);
    destination.searchParams.set('click_id', clickId);

    return new Response(null, {
      status: 302,
      headers: { 'Location': destination.toString() },
    });
  } catch (err: any) {
    console.error('redirect-click error:', err);
    return new Response(`Uncaught Error: ${err.message}`, { status: 500 });
  }
});