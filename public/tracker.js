/* Findora campaign pixel. Add this script to every page of a campaign website. */
(function () {
  var api = 'https://kdncxluglavhsygdxmio.supabase.co/functions/v1';
  var params = new URLSearchParams(window.location.search);
  var clickId = params.get('click_id') || sessionStorage.getItem('findora_click_id');
  if (!clickId) return;

  sessionStorage.setItem('findora_click_id', clickId);
  var sessionId = sessionStorage.getItem('findora_session_id');
  if (!sessionId) {
    sessionId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random();
    sessionStorage.setItem('findora_session_id', sessionId);
  }
  var pageStartedAt = Date.now();
  var sentExit = false;
  var lastRecordedSeconds = 0;

  function send(path, body, beacon) {
    var payload = JSON.stringify(body);
    if (beacon && navigator.sendBeacon) {
      return navigator.sendBeacon(api + path, new Blob([payload], { type: 'application/json' }));
    }
    return fetch(api + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(function () {});
  }

  function pageView() {
    return send('/track-pixel', { click_id: clickId, session_id: sessionId, url: location.href, page_path: location.pathname + location.search });
  }
  function recordDuration(final) {
    var seconds = Math.max(0, Math.round((Date.now() - pageStartedAt) / 1000));
    if (!final && seconds === lastRecordedSeconds) return;
    lastRecordedSeconds = seconds;
    send('/track-exit', { click_id: clickId, session_id: sessionId, duration_seconds: seconds, url: location.href, page_path: location.pathname + location.search }, final);
  }
  function exit() {
    if (sentExit) return;
    sentExit = true;
    recordDuration(true);
  }
  function track(eventName, options) {
    options = options || {};
    return send('/track-event', { click_id: clickId, session_id: sessionId, event_name: eventName, url: location.href, value: options.value, event_data: options.data || {} });
  }

  window.Findora = window.Findora || {};
  window.Findora.track = track;
  window.Findora.trackPurchase = function (revenue, purchaseId) { return track('purchase', { value: revenue, data: { purchase_id: purchaseId || null } }); };
  pageView();
  // Do not rely solely on pagehide: some browsers terminate background pages
  // before a final network request can complete.
  window.setInterval(function () { recordDuration(false); }, 10000);
  window.addEventListener('pagehide', exit);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') exit(); });
})();
