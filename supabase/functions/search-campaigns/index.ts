import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const normalize = (value: unknown) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const aliases: Record<string, string[]> = {
  school: ['education', 'educational', 'academy', 'learning', 'tutor', 'tutoring', 'college', 'university'],
  education: ['school', 'academy', 'learning', 'tutor', 'tutoring'],
  fitness: ['gym', 'workout', 'training', 'exercise'],
  shoes: ['shoe', 'footwear', 'sneaker', 'sneakers'],
};
const singular = (term: string) => term.endsWith('ies') && term.length > 4 ? `${term.slice(0, -3)}y` : term.endsWith('sses') ? term.slice(0, -2) : term.endsWith('ches') || term.endsWith('shes') || term.endsWith('xes') || term.endsWith('zes') ? term.slice(0, -2) : term.endsWith('s') && !term.endsWith('ss') && term.length > 3 ? term.slice(0, -1) : term;
const termsFor = (query: string) => [...new Set(normalize(query).split(' ').filter(term => term.length > 1).map(singular))].slice(0, 8);
const variantsFor = (term: string) => [...new Set([term, `${term}s`, ...(aliases[term] ?? [])])];
const editDistanceAtMostOne = (left: string, right: string) => {
  if (Math.abs(left.length - right.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < left.length && j < right.length) { if (left[i] === right[j]) { i++; j++; } else if (++edits > 1) return false; else if (left.length > right.length) i++; else if (right.length > left.length) j++; else { i++; j++; } }
  return true;
};
const matchStrength = (term: string, fields: string[]) => {
  const variants = variantsFor(term);
  const words = fields.flatMap(field => field.split(' ')).filter(Boolean);
  if (variants.some(variant => words.includes(variant))) return 3;
  if (term.length >= 4 && variants.some(variant => words.some(word => word.startsWith(variant) || variant.startsWith(word)))) return 2;
  if (term.length >= 5 && variants.some(variant => words.some(word => editDistanceAtMostOne(variant, word)))) return 1;
  return 0;
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });
  try {
    const body = await req.json();
    const query = typeof body.query === 'string' ? body.query.slice(0, 120) : '';
    const terms = termsFor(query);
    if (!terms.length) return Response.json({ results: [] }, { headers: cors });
    const db = createClient(url, key);
    const { data: campaigns, error } = await db.from('campaigns')
      .select('id, name, daily_budget, keywords, target_audience, user_id, sites!inner(url, verified)')
      .eq('status', 'active').eq('sites.verified', true).gt('daily_budget', 0).limit(250);
    if (error) throw error;
    const ids = (campaigns ?? []).map(c => c.id);
    const owners = [...new Set((campaigns ?? []).map(c => c.user_id))];
    const [statsResult, paymentsResult] = await Promise.all([
      ids.length ? db.from('campaign_master_stats').select('campaign_id, clicks, impressions, purchases').in('campaign_id', ids) : Promise.resolve({ data: [] as any[] }),
      owners.length ? db.from('payments').select('user_id').in('user_id', owners).eq('status', 'completed') : Promise.resolve({ data: [] as any[] }),
    ]);
    // Search relevance must remain available while optional reporting/billing
    // migrations are being introduced.
    if (statsResult.error) console.warn('Performance boost unavailable', statsResult.error.message);
    if (paymentsResult.error) console.warn('Payment boost unavailable', paymentsResult.error.message);
    const stats = new Map(((statsResult.error ? [] : statsResult.data) ?? []).map(row => [row.campaign_id, row]));
    const paidOwners = new Set(((paymentsResult.error ? [] : paymentsResult.data) ?? []).map(row => row.user_id));
    const phrase = normalize(query);
    const results = (campaigns ?? []).map(campaign => {
      const keywords = Array.isArray(campaign.keywords) ? campaign.keywords.map(normalize) : [];
      const name = normalize(campaign.name), audience = normalize(campaign.target_audience);
      const searchable = [name, audience, ...keywords];
      let relevance = searchable.some(field => field.includes(phrase)) ? 80 : 0;
      let matchedTerms = 0;
      for (const term of terms) {
        const strength = matchStrength(term, searchable);
        if (strength === 3) { relevance += 36; matchedTerms++; }
        else if (strength === 2) { relevance += 22; matchedTerms++; }
        else if (strength === 1) { relevance += 10; matchedTerms++; }
      }
      if (!matchedTerms) return null; // Never return an unrelated verified campaign.
      const stat = stats.get(campaign.id) ?? {};
      const clicks = Number(stat.clicks || 0), impressions = Number(stat.impressions || 0), purchases = Number(stat.purchases || 0);
      // Quality is deliberately capped: payment/performance can break ties, never buy relevance.
      const ctr = impressions ? clicks / impressions : 0;
      const quality = Math.min(8, Math.log10(clicks + 1) * 3) + Math.min(6, ctr * 12) + Math.min(6, purchases * 2) + (paidOwners.has(campaign.user_id) ? 3 : 0) + Math.min(3, Math.log10(Number(campaign.daily_budget) + 1));
      return { id: campaign.id, name: campaign.name, daily_budget: campaign.daily_budget, keywords: campaign.keywords, target_audience: campaign.target_audience, sites: campaign.sites, relevanceScore: relevance, qualityScore: Number(quality.toFixed(2)), totalScore: relevance + quality };
    }).filter(Boolean).sort((a: any, b: any) => b.totalScore - a.totalScore || b.relevanceScore - a.relevanceScore || a.name.localeCompare(b.name)).slice(0, 30);
    return Response.json({ results }, { headers: { ...cors, 'Cache-Control': 'no-store' } });
  } catch (error) { console.error('search-campaigns error', error); return new Response('Unable to search campaigns', { status: 500, headers: cors }); }
});
