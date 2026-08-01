import { useEffect, useState } from 'react';
import { ArrowUpRight, CircleDollarSign, Megaphone, MousePointerClick, Plus, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Campaign = { id: string; name: string; status: string; daily_budget: number; sites: { url: string; verified: boolean } | null };

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [totals, setTotals] = useState({ clicks: 0, cost: 0 });

  useEffect(() => { void load(); }, []);
  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: campaignData }, { data: statsData }] = await Promise.all([
      supabase.from('campaigns').select('id, name, status, daily_budget, sites(url, verified)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('statistics').select('clicks, cost').eq('user_id', user.id),
    ]);
    setCampaigns((campaignData as any) ?? []);
    setTotals((statsData ?? []).reduce((sum: any, row: any) => ({ clicks: sum.clicks + Number(row.clicks || 0), cost: sum.cost + Number(row.cost || 0) }), { clicks: 0, cost: 0 }));
    setLoading(false);
  };

  const active = campaigns.filter(campaign => campaign.status === 'active' && campaign.sites?.verified).length;
  const monthlyBudget = campaigns.filter(campaign => campaign.status === 'active').reduce((sum, campaign) => sum + Number(campaign.daily_budget || 0), 0) * 30;

  return <div className="mx-auto max-w-5xl space-y-8 pb-8">
    <section className="relative overflow-hidden rounded-3xl bg-[#173126] px-6 py-8 text-white sm:px-9 sm:py-10">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#d9ff6c]/15 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70"><Sparkles size={14} className="text-[#d9ff6c]" /> Your workspace</div><h1 className="mt-4 text-3xl font-semibold tracking-[-.045em]">Keep growing, thoughtfully.</h1><p className="mt-2 max-w-md text-sm leading-6 text-white/65">A focused view of the campaigns putting your business in front of the right people.</p></div><Link to="/campaigns" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d9ff6c] px-4 py-3 text-sm font-semibold text-[#173126] transition hover:bg-white"><Plus size={18} /> New campaign</Link></div>
    </section>
    <section className="grid gap-4 sm:grid-cols-3">
      <Metric label="Active campaigns" value={loading ? '...' : String(active)} detail="Verified and visible" icon={<Megaphone size={19} />} />
      <Metric label="Monthly budget" value={loading ? '...' : `$${monthlyBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} detail="Across active campaigns" icon={<CircleDollarSign size={19} />} />
      <Metric label="Total clicks" value={loading ? '...' : totals.clicks.toLocaleString()} detail="All-time campaign traffic" icon={<MousePointerClick size={19} />} />
    </section>
    <section className="overflow-hidden rounded-2xl border border-[#e0e5de] bg-white"><div className="flex items-center justify-between border-b border-[#e9ece8] px-6 py-5"><div><h2 className="font-semibold tracking-[-.02em]">Your campaigns</h2><p className="mt-1 text-sm text-[#78847c]">The essentials, at a glance.</p></div><Link to="/campaigns" className="inline-flex items-center gap-1 text-sm font-semibold text-[#315f49] hover:text-[#173126]">Manage all <ArrowUpRight size={16} /></Link></div>{loading ? <div className="px-6 py-12 text-center text-sm text-[#78847c]">Loading your campaigns...</div> : campaigns.length === 0 ? <div className="px-6 py-14 text-center"><p className="font-medium">Your first campaign starts here.</p><Link to="/campaigns" className="mt-4 inline-flex rounded-lg bg-[#173126] px-4 py-2.5 text-sm font-semibold text-white">Create a campaign</Link></div> : <div className="divide-y divide-[#edf0eb]">{campaigns.slice(0, 4).map(campaign => <div key={campaign.id} className="flex items-center justify-between gap-4 px-6 py-4"><div className="min-w-0"><p className="truncate font-medium">{campaign.name}</p><p className="mt-1 truncate text-sm text-[#78847c]">{campaign.sites?.url || 'Website pending'}</p></div><div className="text-right"><Status status={campaign.sites?.verified ? campaign.status : 'pending'} /><p className="mt-1 text-xs text-[#78847c]">${Number(campaign.daily_budget || 0).toFixed(0)}/day</p></div></div>)}</div>}</section>
  </div>;
}

function Metric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) { return <article className="rounded-2xl border border-[#e0e5de] bg-white p-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e8f2e8] text-[#315f49]">{icon}</span><p className="mt-5 text-sm text-[#758078]">{label}</p><p className="mt-1 text-2xl font-semibold tracking-[-.04em]">{value}</p><p className="mt-1 text-xs text-[#849088]">{detail}</p></article>; }
function Status({ status }: { status: string }) { const active = status === 'active'; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${active ? 'bg-[#e8f2e8] text-[#315f49]' : 'bg-[#f3f1ea] text-[#7a6740]'}`}>{active ? 'Active' : status === 'pending' ? 'Needs verification' : 'Paused'}</span>; }
