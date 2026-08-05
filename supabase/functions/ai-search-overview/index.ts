const apiKey = Deno.env.get('BEWISE_AI_API_KEY');
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });
  try {
    const { query } = await req.json();
    if (typeof query !== 'string' || !query.trim() || query.length > 120) return new Response('Invalid search query', { status: 400, headers: cors });
    if (!apiKey) throw new Error('BEWISE_AI_API_KEY is not configured');
    const prompt = `Give a useful, neutral overview for someone searching Findora for: "${query.trim()}". Use at most two short sentences. Do not claim you searched the web, and do not invent specific businesses, prices, availability, or facts. Focus on what to consider when choosing.`;
    const response = await fetch('https://ai.wisedev.online/chat', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 110 }) });
    if (!response.ok) throw new Error(`Bewise AI request failed (${response.status})`);
    const data = await response.json();
    const overview = typeof data.response === 'string' ? data.response.trim() : '';
    if (!overview) throw new Error('Bewise AI returned an empty response');
    return Response.json({ overview: overview.slice(0, 700) }, { headers: { ...cors, 'Cache-Control': 'no-store' } });
  } catch (error) { console.error('ai-search-overview error', error); return new Response('AI overview unavailable', { status: 502, headers: cors }); }
});
