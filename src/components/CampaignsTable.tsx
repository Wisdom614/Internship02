import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Play, Pause, CheckCircle, XCircle, Clock, ShieldCheck } from 'lucide-react';

type Campaign = {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'pending';
  daily_budget: number;
  created_at: string;
  sites: { 
    id: string;
    url: string; 
    verified: boolean;
    verification_token: string | null;
  } | null;
  clicks: { count: number }[];
};

export default function CampaignsTable() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        id,
        name,
        status,
        daily_budget,
        created_at,
        sites ( id, url, verified, verification_token )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) setCampaigns((data as any) || []);
    setLoading(false);
  };

  const toggleStatus = async (campaign: Campaign) => {
    if (campaign.status !== 'active' && !campaign.sites?.verified) {
      alert('Verify this website before activating its campaign.');
      return;
    }
    setUpdating(campaign.id);
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    const { error } = await supabase.from('campaigns').update({ status: newStatus }).eq('id', campaign.id);
    if (error) {
      alert('Could not update campaign status. Please try again.');
      setUpdating(null);
      return;
    }
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: newStatus as any } : c));
    setUpdating(null);
  };

  const handleVerify = async (campaign: Campaign) => {
    if (!campaign.sites) return;
    setVerifying(campaign.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('https://kdncxluglavhsygdxmio.supabase.co/functions/v1/verify-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({
          site_id: campaign.sites.id,
          url: campaign.sites.url,
          token: campaign.sites.verification_token,
          campaign_id: campaign.id,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Verification failed');
      }

      await fetchCampaigns();
      alert(result.message || 'Verification successful! Your campaign is now active.');
    } catch (error: any) {
      const message = error?.message || 'Could not verify the website.';
      alert(`${message}\n\nIf this is a CORS issue, please allow requests from Findora or verify the meta tag manually.`);
    } finally {
      setVerifying(null);
    }
  };

  useEffect(() => { 
    fetchCampaigns(); 
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-800">My Campaigns</h3>
        <span className="text-sm text-slate-400">{campaigns.length} active</span>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-slate-400">
          <Loader2 className="animate-spin mr-2" size={20} />
          Loading...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          <p>You haven't created any campaigns yet.</p>
          <p className="text-sm mt-1">Go to "Launch Campaign" to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3">Campaign</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Budget</th>
                <th className="px-6 py-3">Clicks</th>
                <th className="px-6 py-3">Website</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((campaign) => {
                const isVerified = campaign.sites?.verified;
                const isPending = !isVerified;

                return (
                  <tr key={campaign.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{campaign.name}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={isPending ? 'pending' : campaign.status} />
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      ${campaign.daily_budget?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 font-medium text-findora-purple">
                      {campaign.clicks?.[0]?.count || 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 truncate max-w-[120px]">
                          {campaign.sites?.url || 'No URL'}
                        </span>
                        {isVerified ? (
                          <CheckCircle size={14} className="text-findora-green" />
                        ) : (
                          <XCircle size={14} className="text-findora-red" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      {isPending ? (
                        <button
                          onClick={() => handleVerify(campaign)}
                          disabled={verifying === campaign.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                        >
                          {verifying === campaign.id ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <>
                              <ShieldCheck size={14} /> Verify
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleStatus(campaign)}
                          disabled={updating === campaign.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            campaign.status === 'active'
                              ? 'bg-findora-red/10 text-findora-red hover:bg-findora-red/20'
                              : 'bg-findora-green/10 text-findora-green hover:bg-findora-green/20'
                          }`}
                        >
                          {updating === campaign.id ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : campaign.status === 'active' ? (
                            <>
                              <Pause size={14} /> Pause
                            </>
                          ) : (
                            <>
                              <Play size={14} /> Activate
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    active: { bg: 'bg-findora-green/10', text: 'text-findora-green', icon: CheckCircle },
    paused: { bg: 'bg-slate-100', text: 'text-slate-600', icon: Pause },
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  };
  const { bg, text, icon: Icon } = config[status as keyof typeof config] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon size={12} />
      <span className="capitalize">{status}</span>
    </span>
  );
}
