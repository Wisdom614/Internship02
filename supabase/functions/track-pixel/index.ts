import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const { click_id, url } = await req.json();
    
    if (!click_id) {
      return new Response('Missing click_id', { status: 400 });
    }

    // The ANON_KEY is safely stored in Supabase's environment variables, not in the script!
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'https://kdncxluglavhsygdxmio.supabase.co',
      Deno.env.get('SUPABASE_ANON_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkbmN4bHVnbGF2aHN5Z2R4bWlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NTAwNTUsImV4cCI6MjEwMTEyNjA1NX0.r276oG2aY2ZhFuBZgn3clgcbhMK7IYURDiaMQk-HMLM'
    );

    const { error } = await supabase
      .from('page_views')
      .insert({ click_id: click_id, url: url });

    if (error) {
      console.error(error);
      return new Response('Error saving page view', { status: 500 });
    }

    return new Response('Page view tracked!', { status: 200 });
  } catch (error) {
    return new Response('Invalid request', { status: 400 });
  }
});