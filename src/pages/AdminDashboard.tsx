import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, CircleDollarSign, Loader2, Megaphone, MousePointerClick, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Campaign = { id: string; user_id: string; name: string; status: 'active' | 'paused' | 'pending'; daily_budget: number; created_at: string; sites: { url: string; verified: boolean } | null };
type Payment = { id: string; user_id: string; amount: number; status: string; is_test: boolean; created_at: string };
type Stats = { user_id: string; clicks: number; cost: number; revenue: number; purchases: number };

const xaf = new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });

export default function AdminDashboard() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats[]>([]);
  const [notice, setNotice] = useState('');

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true); setNotice('');
    const { data: isAdmin, error: roleError } = await supabase.rpc('is_admin');
    if (roleError) { setAuthorized(false); setNotice('Admin access is not configured. Run supabase/sql/admin-access.sql.'); setLoading(false); return; }
    if (!isAdmin) { setAuthorized(false); setLoading(false); return; }
    setAuthorized(true);
    const [campaignResult, paymentResult, statsResult] = await Promise.all([
      supabase.from('campaigns').select('id, user_id, name, status, daily_budget, created_at, sites(url, verified)').order('created_at', { ascending: false }),
      supabase.from('payments').select('id, user_id, amount, status, is_test, created_at').order('created_at', { ascending: false }).limit(8),
      supabase.from('campaign_master_stats').select('user_id, clicks, cost, revenue, purchases'),
    ]);
    if (campaignResult.error || paymentResult.error || statsResult.error) setNotice('Some data could not be loaded. Confirm that the admin SQL setup has been run.');
    setCampaigns((campaignResult.data as unknown as Campaign[]) ?? []);
    setPayments((paymentResult.data as Payment[]) ?? []);
    setStats((statsResult.data as Stats[]) ?? []);
    setLoading(false);
  }

  async function setCampaignStatus(campaignId: string, status: Campaign['status']) {
    setUpdating(campaignId); setNotice('');
    const { error } = await supabase.from('campaigns').update({ status }).eq('id', campaignId);
    if (error) setNotice(error.message);
    else setCampaigns(current => current.map(campaign => campaign.id === campaignId ? { ...campaign, status } : campaign));
    setUpdating(null);
  }

  const summary = useMemo(() => {
    const advertisers = new Set(campaigns.map(campaign => campaign.user_id)).size;
    const clicks = stats.reduce((total, row) => total + Number(row.clicks || 0), 0);
    const adRevenue = stats.reduce((total, row) => total + Number(row.revenue || 0), 0);
    const cost = stats.reduce((total, row) => total + Number(row.cost || 0), 0);
    const deposits = payments.filter(payment => payment.status === 'completed').reduce((total, payment) => total + Number(payment.amount || 0), 0);
    return { advertisers, clicks, adRevenue, cost, deposits, pending: campaigns.filter(campaign => campaign.status === 'pending').length };
  }, [campaigns, payments, stats]);

  if (loading && authorized === null) return <div className="flex min-h-[50vh] items-center justify-center text-[#647268]"><Loader2 className="mr-2 animate-spin" size={20} /> Loading administrator workspace…</div>;
  if (authorized === false) return <Navigate to="/" replace />;

  return <div className="mx-auto max-w-7xl space-y-7 pb-8">
    <section className="rounded-3xl bg-[#173126] px-6 py-8 text-white sm:px-9"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full bg-[#d9ff6c]/15 px-3 py-1.5 text-xs text-[#d9ff6c]"><ShieldCheck size={14} /> Administrator workspace</div><h1 className="mt-4 text-3xl font-semibold tracking-[-.045em]">Platform operations</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Review campaigns, monitor tracked activity, and audit test payments from one place.</p></div><button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-white/15 disabled:opacity-60"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /> Refresh data</button></div></section>
    {notice && <p className="rounded-xl border border-[#f0d39a] bg-[#fff8e8] px-4 py-3 text-sm text-[#7d5b18]"><AlertTriangle className="mr-2 inline" size={16} />{notice}</p>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<Users size={19} />} label="Advertisers" value={String(summary.advertisers)} detail="Accounts with campaigns" /><Metric icon={<Megaphone size={19} />} label="Awaiting review" value={String(summary.pending)} detail="Pending campaigns" /><Metric icon={<MousePointerClick size={19} />} label="Tracked clicks" value={summary.clicks.toLocaleString()} detail="Across all campaigns" /><Metric icon={<CircleDollarSign size={19} />} label="Test deposits" value={xaf.format(summary.deposits)} detail="Completed simulations" /></section>
    <section className="grid gap-6 xl:grid-cols-[1.6fr_.8fr]"><div className="overflow-hidden rounded-2xl border border-[#e0e5de] bg-white"><div className="flex items-center justify-between border-b border-[#e9ece8] px-6 py-5"><div><h2 className="font-semibold">Campaign review queue</h2><p className="mt-1 text-sm text-[#78847c]">Activate, pause, or keep campaigns pending.</p></div><span className="rounded-full bg-[#fff3d9] px-3 py-1 text-xs font-semibold text-[#936b24]">{summary.pending} pending</span></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[#fafbfa] text-xs font-semibold uppercase tracking-wide text-[#758078]"><tr><th className="px-6 py-3">Campaign</th><th className="px-4 py-3">Site status</th><th className="px-4 py-3">Daily budget</th><th className="px-4 py-3">Created</th><th className="px-6 py-3 text-right">Status</th></tr></thead><tbody className="divide-y divide-[#edf0eb]">{campaigns.map(campaign => <tr key={campaign.id}><td className="px-6 py-4"><p className="font-medium text-[#17211d]">{campaign.name}</p><p className="mt-0.5 max-w-52 truncate text-xs text-[#78847c]">{campaign.sites?.url || 'No destination site'}</p></td><td className="px-4 py-4">{campaign.sites?.verified ? <span className="inline-flex items-center gap-1 text-xs font-medium text-[#315f49]"><BadgeCheck size={15} /> Verified</span> : <span className="text-xs font-medium text-[#936b24]">Not verified</span>}</td><td className="px-4 py-4 font-medium">${Number(campaign.daily_budget || 0).toFixed(2)}</td><td className="px-4 py-4 text-xs text-[#78847c]">{new Date(campaign.created_at).toLocaleDateString()}</td><td className="px-6 py-4 text-right"><select aria-label={`Status for ${campaign.name}`} value={campaign.status} disabled={updating === campaign.id} onChange={event => void setCampaignStatus(campaign.id, event.target.value as Campaign['status'])} className="rounded-lg border border-[#dce3dc] bg-white px-2.5 py-2 text-xs font-semibold capitalize outline-none focus:border-[#315f49]">{['pending', 'active', 'paused'].map(status => <option key={status}>{status}</option>)}</select></td></tr>)}{campaigns.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-[#78847c]">No campaigns have been created yet.</td></tr>}</tbody></table></div></div>
      <div className="space-y-6"><section className="rounded-2xl border border-[#e0e5de] bg-white p-6"><h2 className="font-semibold">Ad performance</h2><dl className="mt-5 space-y-4 text-sm"><Line label="Attributed revenue" value={`$${summary.adRevenue.toFixed(2)}`} /><Line label="Estimated ad cost" value={`$${summary.cost.toFixed(2)}`} /><Line label="Estimated margin" value={`$${(summary.adRevenue - summary.cost).toFixed(2)}`} /></dl></section><section className="overflow-hidden rounded-2xl border border-[#e0e5de] bg-white"><div className="border-b border-[#e9ece8] px-6 py-5"><h2 className="font-semibold">Recent payments</h2><p className="mt-1 text-sm text-[#78847c]">Test ledger activity.</p></div>{payments.length === 0 ? <p className="px-6 py-8 text-sm text-[#78847c]">No payments recorded yet.</p> : <div className="divide-y divide-[#edf0eb]">{payments.map(payment => <div key={payment.id} className="flex items-center justify-between gap-3 px-6 py-3.5"><div><p className="text-sm font-medium">{payment.is_test ? 'Test payment' : 'Payment'}</p><p className="text-xs text-[#78847c]">{new Date(payment.created_at).toLocaleDateString()}</p></div><p className="font-semibold">{xaf.format(Number(payment.amount))}</p></div>)}</div>}</section></div>
    </section>
  </div>;
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) { return <article className="rounded-2xl border border-[#e0e5de] bg-white p-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e8f2e8] text-[#315f49]">{icon}</span><p className="mt-5 text-sm text-[#758078]">{label}</p><p className="mt-1 text-2xl font-semibold tracking-[-.04em] text-[#17211d]">{value}</p><p className="mt-1 text-xs text-[#849088]">{detail}</p></article>; }
function Line({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3"><dt className="text-[#78847c]">{label}</dt><dd className="font-semibold text-[#17211d]">{value}</dd></div>; }
