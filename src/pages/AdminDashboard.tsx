import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, Ban, CircleDollarSign, Loader2, Mail, Megaphone, MousePointerClick, RefreshCw, ShieldCheck, Trash2, UserCheck, Users } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Campaign = { id: string; user_id: string; name: string; status: 'active' | 'paused' | 'pending'; daily_budget: number; created_at: string; sites: { url: string; verified: boolean } | null };
type Payment = { id: string; user_id: string; amount: number; status: string; is_test: boolean; created_at: string };
type Stats = { user_id: string; clicks: number; cost: number; revenue: number; purchases: number };
type ManagedUser = { id: string; email: string; created_at: string; verified: boolean; suspended: boolean; campaigns: number };

const xaf = new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });

export default function AdminDashboard() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [notice, setNotice] = useState('');

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true); setNotice('');
    const { data: isAdmin, error: roleError } = await supabase.rpc('is_admin');
    if (roleError) { setAuthorized(false); setNotice('Admin access is not configured. Run supabase/sql/admin-access.sql.'); setLoading(false); return; }
    if (!isAdmin) { setAuthorized(false); setLoading(false); return; }
    setAuthorized(true);
    const [campaignResult, paymentResult, statsResult, userResult] = await Promise.all([
      supabase.from('campaigns').select('id, user_id, name, status, daily_budget, created_at, sites(url, verified)').order('created_at', { ascending: false }),
      supabase.from('payments').select('id, user_id, amount, status, is_test, created_at').order('created_at', { ascending: false }).limit(8),
      supabase.from('campaign_master_stats').select('user_id, clicks, cost, revenue, purchases'),
      adminRequest('list'),
    ]);
    if (campaignResult.error || paymentResult.error || statsResult.error || !userResult.ok) setNotice('Some data could not be loaded. Confirm that the admin SQL setup and admin-management function are ready.');
    setCampaigns((campaignResult.data as unknown as Campaign[]) ?? []);
    setPayments((paymentResult.data as Payment[]) ?? []);
    setStats((statsResult.data as Stats[]) ?? []);
    if (userResult.ok) { const data = await userResult.json(); setUsers((data.users ?? []) as ManagedUser[]); }
    setLoading(false);
  }

  async function adminRequest(action: string, payload: Record<string, unknown> = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    return fetch('https://kdncxluglavhsygdxmio.supabase.co/functions/v1/admin-management', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify({ action, ...payload }) });
  }

  async function setCampaignStatus(campaignId: string, status: Campaign['status']) {
    setUpdating(campaignId); setNotice('');
    const response = await adminRequest(status === 'active' ? 'approve_campaign' : 'pause_campaign', { campaign_id: campaignId });
    if (!response.ok) setNotice(await response.text());
    else setCampaigns(current => current.map(campaign => campaign.id === campaignId ? { ...campaign, status, sites: status === 'active' ? { ...(campaign.sites ?? { url: '', verified: true }), verified: true } : campaign.sites } : campaign));
    setUpdating(null);
  }

  async function deleteCampaign(campaign: Campaign) {
    if (!window.confirm(`Permanently delete campaign “${campaign.name}”?`)) return;
    setUpdating(campaign.id); const response = await adminRequest('delete_campaign', { campaign_id: campaign.id });
    if (!response.ok) setNotice(await response.text()); else setCampaigns(current => current.filter(item => item.id !== campaign.id));
    setUpdating(null);
  }

  async function manageUser(action: 'verify_user' | 'suspend_user' | 'restore_user' | 'delete_user' | 'contact_user', user: ManagedUser) {
    if (action === 'delete_user' && !window.confirm(`Permanently delete ${user.email} and their data? This cannot be undone.`)) return;
    let subject = '', body = '';
    if (action === 'contact_user') { subject = window.prompt(`Email subject for ${user.email}`) ?? ''; if (!subject) return; body = window.prompt('Message') ?? ''; if (!body) return; }
    setUpdating(user.id); setNotice(''); const response = await adminRequest(action, { user_id: user.id, subject, body });
    if (!response.ok) setNotice(await response.text());
    else if (action === 'delete_user') setUsers(current => current.filter(item => item.id !== user.id));
    else if (action === 'contact_user') { const data = await response.json(); if (data.email) window.location.href = `mailto:${encodeURIComponent(data.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; setNotice('Message logged and your email client has been opened.'); }
    else setUsers(current => current.map(item => item.id === user.id ? { ...item, verified: action === 'verify_user' ? true : item.verified, suspended: action === 'suspend_user' ? true : action === 'restore_user' ? false : item.suspended } : item));
    setUpdating(null);
  }

  const summary = useMemo(() => {
    const advertisers = users.length || new Set(campaigns.map(campaign => campaign.user_id)).size;
    const clicks = stats.reduce((total, row) => total + Number(row.clicks || 0), 0);
    const adRevenue = stats.reduce((total, row) => total + Number(row.revenue || 0), 0);
    const cost = stats.reduce((total, row) => total + Number(row.cost || 0), 0);
    const deposits = payments.filter(payment => payment.status === 'completed').reduce((total, payment) => total + Number(payment.amount || 0), 0);
    return { advertisers, clicks, adRevenue, cost, deposits, pending: campaigns.filter(campaign => campaign.status === 'pending').length, suspended: users.filter(user => user.suspended).length };
  }, [campaigns, payments, stats, users]);

  if (loading && authorized === null) return <div className="flex min-h-[50vh] items-center justify-center text-[#647268]"><Loader2 className="mr-2 animate-spin" size={20} /> Loading administrator workspace…</div>;
  if (authorized === false) return <Navigate to="/" replace />;

  return <div className="mx-auto max-w-7xl space-y-7 pb-8">
    <section className="rounded-3xl bg-[#173126] px-6 py-8 text-white sm:px-9"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full bg-[#d9ff6c]/15 px-3 py-1.5 text-xs text-[#d9ff6c]"><ShieldCheck size={14} /> Administrator workspace</div><h1 className="mt-4 text-3xl font-semibold tracking-[-.045em]">Platform operations</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Review campaigns, monitor tracked activity, and audit test payments from one place.</p></div><button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-white/15 disabled:opacity-60"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /> Refresh data</button></div></section>
    {notice && <p className="rounded-xl border border-[#f0d39a] bg-[#fff8e8] px-4 py-3 text-sm text-[#7d5b18]"><AlertTriangle className="mr-2 inline" size={16} />{notice}</p>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<Users size={19} />} label="Advertisers" value={String(summary.advertisers)} detail="Accounts with campaigns" /><Metric icon={<Megaphone size={19} />} label="Awaiting review" value={String(summary.pending)} detail="Pending campaigns" /><Metric icon={<MousePointerClick size={19} />} label="Tracked clicks" value={summary.clicks.toLocaleString()} detail="Across all campaigns" /><Metric icon={<CircleDollarSign size={19} />} label="Test deposits" value={xaf.format(summary.deposits)} detail="Completed simulations" /></section>
    <section className="overflow-hidden rounded-2xl border border-[#e0e5de] bg-white"><div className="flex items-center justify-between border-b border-[#e9ece8] px-6 py-5"><div><h2 className="font-semibold">User management</h2><p className="mt-1 text-sm text-[#78847c]">Verify accounts, suspend access, contact advertisers, or permanently remove an account.</p></div>{summary.suspended > 0 && <span className="rounded-full bg-[#fff3d9] px-3 py-1 text-xs font-semibold text-[#936b24]">{summary.suspended} suspended</span>}</div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-[#fafbfa] text-xs font-semibold uppercase tracking-wide text-[#758078]"><tr><th className="px-6 py-3">User</th><th className="px-4 py-3">Verification</th><th className="px-4 py-3">Campaigns</th><th className="px-4 py-3">Joined</th><th className="px-6 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf0eb]">{users.map(user => <tr key={user.id}><td className="px-6 py-4"><p className="font-medium text-[#17211d]">{user.email || 'No email address'}</p><p className={`mt-0.5 text-xs ${user.suspended ? 'text-red-600' : 'text-[#78847c]'}`}>{user.suspended ? 'Suspended' : 'Active account'}</p></td><td className="px-4 py-4">{user.verified ? <span className="inline-flex items-center gap-1 text-xs font-medium text-[#315f49]"><BadgeCheck size={15} /> Verified</span> : <button disabled={updating === user.id} onClick={() => void manageUser('verify_user', user)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#315f49] hover:underline"><UserCheck size={15} /> Verify</button>}</td><td className="px-4 py-4">{user.campaigns}</td><td className="px-4 py-4 text-xs text-[#78847c]">{new Date(user.created_at).toLocaleDateString()}</td><td className="px-6 py-4"><div className="flex justify-end gap-2"><button disabled={updating === user.id} onClick={() => void manageUser('contact_user', user)} className="rounded-lg border border-[#dce3dc] p-2 text-[#315f49] hover:bg-[#f2f6f0]" title="Contact user"><Mail size={15} /></button><button disabled={updating === user.id} onClick={() => void manageUser(user.suspended ? 'restore_user' : 'suspend_user', user)} className="rounded-lg border border-[#dce3dc] p-2 text-[#936b24] hover:bg-[#fff8e8]" title={user.suspended ? 'Restore user' : 'Suspend user'}><Ban size={15} /></button><button disabled={updating === user.id} onClick={() => void manageUser('delete_user', user)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50" title="Delete user"><Trash2 size={15} /></button></div></td></tr>)}{users.length === 0 && !loading && <tr><td colSpan={5} className="px-6 py-12 text-center text-[#78847c]">No user records available.</td></tr>}</tbody></table></div></section>
    <section className="grid gap-6 xl:grid-cols-[1.6fr_.8fr]"><div className="overflow-hidden rounded-2xl border border-[#e0e5de] bg-white"><div className="flex items-center justify-between border-b border-[#e9ece8] px-6 py-5"><div><h2 className="font-semibold">Campaign review queue</h2><p className="mt-1 text-sm text-[#78847c]">Approve, pause, or remove campaigns.</p></div><span className="rounded-full bg-[#fff3d9] px-3 py-1 text-xs font-semibold text-[#936b24]">{summary.pending} pending</span></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[#fafbfa] text-xs font-semibold uppercase tracking-wide text-[#758078]"><tr><th className="px-6 py-3">Campaign</th><th className="px-4 py-3">Site status</th><th className="px-4 py-3">Daily budget</th><th className="px-4 py-3">Created</th><th className="px-6 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf0eb]">{campaigns.map(campaign => <tr key={campaign.id}><td className="px-6 py-4"><p className="font-medium text-[#17211d]">{campaign.name}</p><p className="mt-0.5 max-w-52 truncate text-xs text-[#78847c]">{campaign.sites?.url || 'No destination site'}</p></td><td className="px-4 py-4">{campaign.sites?.verified ? <span className="inline-flex items-center gap-1 text-xs font-medium text-[#315f49]"><BadgeCheck size={15} /> Verified</span> : <span className="text-xs font-medium text-[#936b24]">Not verified</span>}</td><td className="px-4 py-4 font-medium">${Number(campaign.daily_budget || 0).toFixed(2)}</td><td className="px-4 py-4 text-xs text-[#78847c]">{new Date(campaign.created_at).toLocaleDateString()}</td><td className="px-6 py-4"><div className="flex justify-end gap-2"><select aria-label={`Status for ${campaign.name}`} value={campaign.status} disabled={updating === campaign.id} onChange={event => void setCampaignStatus(campaign.id, event.target.value as Campaign['status'])} className="rounded-lg border border-[#dce3dc] bg-white px-2.5 py-2 text-xs font-semibold capitalize outline-none focus:border-[#315f49]">{['pending', 'active', 'paused'].map(status => <option key={status}>{status}</option>)}</select><button disabled={updating === campaign.id} onClick={() => void deleteCampaign(campaign)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50" title="Delete campaign"><Trash2 size={15} /></button></div></td></tr>)}{campaigns.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-[#78847c]">No campaigns have been created yet.</td></tr>}</tbody></table></div></div>
      <div className="space-y-6"><section className="rounded-2xl border border-[#e0e5de] bg-white p-6"><h2 className="font-semibold">Ad performance</h2><dl className="mt-5 space-y-4 text-sm"><Line label="Attributed revenue" value={`$${summary.adRevenue.toFixed(2)}`} /><Line label="Estimated ad cost" value={`$${summary.cost.toFixed(2)}`} /><Line label="Estimated margin" value={`$${(summary.adRevenue - summary.cost).toFixed(2)}`} /></dl></section><section className="overflow-hidden rounded-2xl border border-[#e0e5de] bg-white"><div className="border-b border-[#e9ece8] px-6 py-5"><h2 className="font-semibold">Recent payments</h2><p className="mt-1 text-sm text-[#78847c]">Test ledger activity.</p></div>{payments.length === 0 ? <p className="px-6 py-8 text-sm text-[#78847c]">No payments recorded yet.</p> : <div className="divide-y divide-[#edf0eb]">{payments.map(payment => <div key={payment.id} className="flex items-center justify-between gap-3 px-6 py-3.5"><div><p className="text-sm font-medium">{payment.is_test ? 'Test payment' : 'Payment'}</p><p className="text-xs text-[#78847c]">{new Date(payment.created_at).toLocaleDateString()}</p></div><p className="font-semibold">{xaf.format(Number(payment.amount))}</p></div>)}</div>}</section></div>
    </section>
  </div>;
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) { return <article className="rounded-2xl border border-[#e0e5de] bg-white p-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e8f2e8] text-[#315f49]">{icon}</span><p className="mt-5 text-sm text-[#758078]">{label}</p><p className="mt-1 text-2xl font-semibold tracking-[-.04em] text-[#17211d]">{value}</p><p className="mt-1 text-xs text-[#849088]">{detail}</p></article>; }
function Line({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3"><dt className="text-[#78847c]">{label}</dt><dd className="font-semibold text-[#17211d]">{value}</dd></div>; }
