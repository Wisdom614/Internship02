import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const { click_id, revenue } = await req.json();
    
    if (!click_id || !revenue) {
      return new Response('Missing click_id or revenue', { status: 400 });
    }

    // Use the SERVICE_ROLE key here (This bypasses RLS security)
    // This key is safe here because it's in the backend, NOT in the frontend script.
    const supabase = createClient(
      'https://kdncxluglavhsygdxmio.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkbmN4bHVnbGF2aHN5Z2R4bWlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTU1MDA1NSwiZXhwIjoyMTAxMTI2MDU1fQ.9cgAL5sNN-TRoywWQCGhUBbpvQi_uksMPGIAyghFcDQ'
    );

    // 1. Verify the click_id actually exists in our database
    const { data: clickData, error: checkError } = await supabase
      .from('clicks')
      .select('id')
      .eq('click_id', click_id)
      .single();

    if (checkError || !clickData) {
      console.error("Click not found:", checkError);
      return new Response('Invalid click_id. Click not found.', { status: 404 });
    }

    // 2. Insert the fake conversion
    const { error: insertError } = await supabase
      .from('conversions')
      .insert({
        click_id: click_id,
        revenue: revenue,
        purchase_id: `SIM_${Date.now()}`
      });

    if (insertError) {
      console.error(insertError);
      return new Response('Error saving conversion', { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, message: `Simulated $${revenue} purchase!` }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Uncaught error:", error);
    return new Response('Invalid request', { status: 400 });
  }
});