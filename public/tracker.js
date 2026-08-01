// findora/public/tracker.js
(function() {
  // 1. Check if there is a click_id in the URL (e.g., ?click_id=xyz)
  const urlParams = new URLSearchParams(window.location.search);
  const clickId = urlParams.get('click_id');
  
  // If no click_id, this is organic traffic. We don't track it for campaigns.
  if (!clickId) return;

  const startTime = Date.now();
  const supabaseUrl = 'https://kdncxluglavhsygdxmio.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkbmN4bHVnbGF2aHN5Z2R4bWlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NTAwNTUsImV4cCI6MjEwMTEyNjA1NX0.r276oG2aY2ZhFuBZgn3clgcbhMK7IYURDiaMQk-HMLM';

  // 2. Send a "Page View" to the page_views table
  async function trackPageView() {
    try {
      await fetch(`${supabaseUrl}/rest/v1/page_views`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          click_id: clickId,
          url: window.location.href
        })
      });
    } catch (e) {
      // Silently fail so we don't break the user's website
    }
  }

  // 3. Send "Time Spent" when the user leaves or closes the tab
  async function trackExit() {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    if (duration < 1) return; // Don't track bounces of less than 1 second

    try {
      // Note: We use navigator.sendBeacon because fetch might get cancelled on page unload
      const data = JSON.stringify({
        click_id: clickId,
        duration_seconds: duration
      });
      navigator.sendBeacon(`${supabaseUrl}/functions/v1/track-exit`, data);
    } catch (e) {
      // Silently fail
    }
  }

  // 4. Run the tracking functions
  trackPageView();
  window.addEventListener('beforeunload', trackExit);
})();