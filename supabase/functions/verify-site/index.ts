import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://kdncxluglavhsygdxmio.supabase.co';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { site_id, url, token, campaign_id } = await req.json();

    if (!site_id || !url || !token || !campaign_id) {
      return new Response(JSON.stringify({ message: 'Missing required verification data.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const authorization = req.headers.get('authorization') || '';
    const accessToken = authorization.replace(/^Bearer\s+/i, '');
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ message: 'Please sign in again before verifying a site.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Do not trust IDs, URL, or token supplied by the browser. They must all match
    // a campaign owned by the signed-in advertiser.
    const { data: campaign, error: campaignLookupError } = await supabase
      .from('campaigns')
      .select('id, site_id, user_id, sites(id, url, verification_token)')
      .eq('id', campaign_id)
      .eq('user_id', authData.user.id)
      .single();
    const site = Array.isArray(campaign?.sites) ? campaign?.sites[0] : campaign?.sites;
    if (campaignLookupError || !campaign || campaign.site_id !== site_id || !site || site.url !== url || site.verification_token !== token) {
      return new Response(JSON.stringify({ message: 'This verification request does not match a campaign you own.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const response = await fetch(site.url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Findora-Verification/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      const message = `Unable to fetch website (${response.status}). Please ensure the URL is public and reachable.`;
      return new Response(JSON.stringify({ message }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const html = await response.text();
    const regex = new RegExp(`<meta[^>]*name=["']findora-verify["'][^>]*content=["']${token}["'][^>]*>`, 'i');

    if (!regex.test(html)) {
      return new Response(JSON.stringify({ message: 'Verification token not found in website HTML. Add <meta name="findora-verify" content="TOKEN"> to your <head>.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { error: siteError } = await supabase
      .from('sites')
      .update({ verified: true, last_verified_at: new Date().toISOString() })
      .eq('id', site_id);

    if (siteError) {
      console.error('Site update failed:', siteError);
      return new Response(JSON.stringify({ message: 'Failed to update site verification status.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { error: campaignError } = await supabase
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', campaign_id);

    if (campaignError) {
      console.error('Campaign update failed:', campaignError);
      return new Response(JSON.stringify({ message: 'Site verified but failed to activate campaign.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ message: 'Verification successful. Your site is verified and campaign is now active.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('verify-site error:', error);
    return new Response(JSON.stringify({ message: error?.message || 'Verification failed due to an unexpected error.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
