import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const db = createClient(url, serviceKey);

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return new Response('Unauthorized', { status: 401, headers: cors });
    const { data: identity } = await db.auth.getUser(token);
    const actor = identity.user;
    const { data: admin } = actor ? await db.from('admin_users').select('user_id').eq('user_id', actor.id).maybeSingle() : { data: null };
    if (!actor || !admin) return new Response('Forbidden', { status: 403, headers: cors });
    const { action, user_id, campaign_id, subject, body } = await req.json();
    if (action === 'list') {
      const { data: authData, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 }); if (error) throw error;
      const users = authData.users;
      const ids = users.map(user => user.id);
      const [profiles, campaigns] = await Promise.all([db.from('user_profiles').select('user_id, is_verified, suspended').in('user_id', ids), db.from('campaigns').select('user_id').in('user_id', ids)]);
      if (profiles.error || campaigns.error) throw profiles.error || campaigns.error;
      const profileById = new Map((profiles.data ?? []).map(profile => [profile.user_id, profile]));
      const campaignCount = new Map<string, number>(); (campaigns.data ?? []).forEach(c => campaignCount.set(c.user_id, (campaignCount.get(c.user_id) ?? 0) + 1));
      return Response.json({ users: users.map(user => ({ id: user.id, email: user.email ?? '', created_at: user.created_at, verified: profileById.get(user.id)?.is_verified ?? false, suspended: profileById.get(user.id)?.suspended ?? false, campaigns: campaignCount.get(user.id) ?? 0 })) }, { headers: cors });
    }
    if (typeof user_id === 'string') {
      if (user_id === actor.id && ['suspend_user', 'delete_user'].includes(action)) return new Response('You cannot moderate your own administrator account', { status: 400, headers: cors });
      if (action === 'suspend_user' || action === 'restore_user') {
        const suspended = action === 'suspend_user'; const { error } = await db.auth.admin.updateUserById(user_id, { ban_duration: suspended ? '876000h' : 'none' }); if (error) throw error;
        const { error: profileError } = await db.from('user_profiles').upsert({ user_id, suspended, updated_at: new Date().toISOString() }); if (profileError) throw profileError;
      } else if (action === 'verify_user') { const { error } = await db.from('user_profiles').upsert({ user_id, is_verified: true, updated_at: new Date().toISOString() }); if (error) throw error;
      } else if (action === 'delete_user') { const { error } = await db.auth.admin.deleteUser(user_id); if (error) throw error;
      } else if (action === 'contact_user') {
        if (typeof subject !== 'string' || typeof body !== 'string' || !subject.trim() || !body.trim()) return new Response('A subject and message are required', { status: 400, headers: cors });
        const { data: recipient, error: userError } = await db.auth.admin.getUserById(user_id); if (userError) throw userError;
        const { error } = await db.from('admin_messages').insert({ sender_id: actor.id, recipient_id: user_id, subject: subject.trim(), body: body.trim() }); if (error) throw error;
        return Response.json({ email: recipient.user.email ?? '' }, { headers: cors });
      } else return new Response('Unknown action', { status: 400, headers: cors });
      return Response.json({ ok: true }, { headers: cors });
    }
    if (typeof campaign_id === 'string') {
      if (action === 'approve_campaign') {
        const { data: campaign, error } = await db.from('campaigns').select('site_id').eq('id', campaign_id).single(); if (error) throw error;
        const [site, update] = await Promise.all([db.from('sites').update({ verified: true, last_verified_at: new Date().toISOString() }).eq('id', campaign.site_id), db.from('campaigns').update({ status: 'active' }).eq('id', campaign_id)]); if (site.error || update.error) throw site.error || update.error;
      } else if (action === 'pause_campaign') { const { error } = await db.from('campaigns').update({ status: 'paused' }).eq('id', campaign_id); if (error) throw error;
      } else if (action === 'delete_campaign') { const { error } = await db.from('campaigns').delete().eq('id', campaign_id); if (error) throw error;
      } else return new Response('Unknown action', { status: 400, headers: cors });
      return Response.json({ ok: true }, { headers: cors });
    }
    return new Response('Missing target', { status: 400, headers: cors });
  } catch (error) { console.error('admin-management error', error); return new Response(error instanceof Error ? error.message : 'Admin operation failed', { status: 500, headers: cors }); }
});
