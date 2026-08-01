import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const campaignId = url.searchParams.get('cid');
    console.log("DEBUG: Received request for campaign:", campaignId);
    
    const supabase = createClient(
      'https://kdncxluglavhsygdxmio.supabase.co', 
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkbmN4bHVnbGF2aHN5Z2R4bWlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NTAwNTUsImV4cCI6MjEwMTEyNjA1NX0.r276oG2aY2ZhFuBZgn3clgcbhMK7IYURDiaMQk-HMLM'
    );

    if (!campaignId) {
      console.error("DEBUG: Missing campaign ID");
      return new Response('Missing campaign ID (cid)', { status: 400 });
    }

    // 1. Get the destination URL
    console.log("DEBUG: Fetching campaign from DB...");
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('site: sites(url)')
      .eq('id', campaignId)
      .single();

    if (error) {
      console.error("DEBUG: Supabase Error fetching campaign:", error);
      return new Response(`DB Error: ${error.message}`, { status: 404 });
    }

    if (!campaign) {
      console.error("DEBUG: Campaign not found");
      return new Response('Campaign not found', { status: 404 });
    }

    console.log("DEBUG: Found site URL:", campaign.site.url);

    // 2. Generate unique Click ID
    const clickId = crypto.randomUUID();
    console.log("DEBUG: Generated Click ID:", clickId);

    // 3. Log the click
    console.log("DEBUG: Attempting to insert click into table...");
    const { error: insertError } = await supabase
      .from('clicks')
      .insert({
        campaign_id: campaignId,
        click_id: clickId,
        ip_address: req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent'),
        referrer: req.headers.get('referer'),
      });

    if (insertError) {
      console.error("DEBUG: Failed to insert click:", insertError);
      return new Response(`Insert Error: ${insertError.message}`, { status: 500 });
    }

    console.log("DEBUG: Click inserted successfully!");

    // 4. Redirect
    const destination = new URL(campaign.site.url);
    destination.searchParams.set('click_id', clickId);
    console.log("DEBUG: Redirecting to:", destination.toString());

    return new Response(null, {
      status: 302,
      headers: { 'Location': destination.toString() },
    });

  } catch (err: any) {
    console.error("DEBUG: Uncaught Error:", err);
    return new Response(`Uncaught Error: ${err.message}`, { status: 500 });
  }
});