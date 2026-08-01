import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const { click_id, duration_seconds } = await req.json();
    
    if (!click_id) {
      return new Response('Missing click_id', { status: 400 });
    }

    const supabase = createClient(
      'https://kdncxluglavhsygdxmio.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkbmN4bHVnbGF2aHN5Z2R4bWlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NTAwNTUsImV4cCI6MjEwMTEyNjA1NX0.r276oG2aY2ZhFuBZgn3clgcbhMK7IYURDiaMQk-HMLM'
    );

    // Update the page_views record with the duration
    // Since we don't know the exact page_view ID, we'll just update the latest one for this click_id
    const { error } = await supabase
      .from('page_views')
      .update({ duration_seconds: duration_seconds })
      .eq('click_id', click_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error(error);
      return new Response('Error saving duration', { status: 500 });
    }

    return new Response('Duration tracked!', { status: 200 });
  } catch (error) {
    return new Response('Invalid request', { status: 400 });
  }
});