import { useEffect, useState } from 'react';
import { 
  MousePointerClick, Clock, DollarSign, TrendingUp, Users, 
  Eye, ShoppingBag, BarChart2 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

const formatTime = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [simulating, setSimulating] = useState(false);

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Query the Master Stats View
    const { data: statsData, error } = await supabase
      .from('campaign_master_stats')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error("Stat fetch error:", error);
      setLoading(false);
      return;
    }

    // Aggregate totals across all campaigns
    const totals = statsData?.reduce((acc, curr) => ({
      sessions: acc.sessions + Number(curr.sessions),
      clicks: acc.clicks + Number(curr.clicks),
      impressions: acc.impressions + Number(curr.impressions),
      purchases: acc.purchases + Number(curr.purchases),
      revenue: acc.revenue + Number(curr.revenue),
      ctr: 0, // We will calculate manually
      cpc: 0,
      roas: 0,
      purchase_rate: 0,
      avg_engagement: acc.avg_engagement + Number(curr.avg_engagement)
    }), { sessions: 0, clicks: 0, impressions: 0, purchases: 0, revenue: 0, avg_engagement: 0 });

    if (totals) {
      // Calculate aggregate percentages
      const totalClicks = totals.clicks || 1;
      const totalImpressions = totals.impressions || 1;
      const revenue = totals.revenue || 0;

      totals.ctr = (totalClicks / totalImpressions) * 100;
      totals.cpc = revenue / totalClicks;
      totals.roas = (revenue / (totalClicks * 0.50)) * 100; // Assuming 0.50 CPC
      totals.purchase_rate = (totals.purchases / totalClicks) * 100;
      totals.avg_engagement = statsData?.length > 0 ? totals.avg_engagement / statsData.length : 0;

      setStats(totals);
    }

    // Get chart data (Daily trends)
    const { data: chartRaw } = await supabase
      .from('clicks')
      .select('created_at')
      .eq('campaigns.user_id', user.id)
      .order('created_at', { ascending: true });

    const grouped: { [key: string]: number } = {};
    chartRaw?.forEach((item) => {
      const date = new Date(item.created_at).toLocaleDateString();
      grouped[date] = (grouped[date] || 0) + 1;
    });

    const formattedChart = Object.keys(grouped).map((date) => ({
      date,
      clicks: grouped[date],
    }));

    setChartData(formattedChart);
    setLoading(false);
  };

  const handleSimulatePurchase = async () => {
    // Fetch the latest click_id
    const { data: latestClick } = await supabase
      .from('clicks')
      .select('click_id')
      .eq('campaigns.user_id', (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!latestClick) {
      alert("Please generate a tracking link and click it first.");
      return;
    }

    setSimulating(true);
    await fetch('https://kdncxluglavhsygdxmio.supabase.co/functions/v1/simulate-purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ click_id: latestClick.click_id, revenue: 49.99 })
    });
    await fetchStats(); // Refresh dashboard instantly
    setSimulating(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <div className="flex justify-center p-10 text-slate-400">Loading Dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Top Metrics Grid (Matches your Screenshot) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard title="Sessions" value={stats?.sessions.toLocaleString() || '0'} icon={Users} color="bg-findora-purple/10 text-findora-purple" />
        <MetricCard title="Clicks" value={stats?.clicks.toLocaleString() || '0'} icon={MousePointerClick} color="bg-findora-blue/10 text-findora-blue" />
        <MetricCard title="Impressions" value={stats?.impressions.toLocaleString() || '0'} icon={Eye} color="bg-slate-100 text-slate-700" />
        <MetricCard title="Purchases" value={stats?.purchases.toLocaleString() || '0'} icon={ShoppingBag} color="bg-findora-green/10 text-findora-green" />
        <MetricCard title="Revenue" value={formatCurrency(stats?.revenue || 0)} icon={DollarSign} color="bg-findora-green/10 text-findora-green" />
        <MetricCard title="Avg. Engmt" value={formatTime(stats?.avg_engagement || 0)} icon={Clock} color="bg-findora-purple/10 text-findora-purple" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="CTR" value={`${(stats?.ctr || 0).toFixed(2)}%`} icon={BarChart2} color="bg-findora-blue/10 text-findora-blue" />
        <MetricCard title="CPC" value={formatCurrency(stats?.cpc || 0)} icon={DollarSign} color="bg-findora-green/10 text-findora-green" />
        <MetricCard title="Purchase Rate" value={`${(stats?.purchase_rate || 0).toFixed(2)}%`} icon={TrendingUp} color="bg-findora-purple/10 text-findora-purple" />
        <MetricCard title="ROAS" value={`${(stats?.roas || 0).toFixed(2)}%`} icon={TrendingUp} color="bg-findora-red/10 text-findora-red" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-container h-80">
          <h3 className="font-semibold text-slate-700 mb-4">Clicks Over Time</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip />
                <Line type="monotone" dataKey="clicks" stroke="#6C5CE7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">No data yet</div>
          )}
        </div>

        <div className="chart-container h-80 flex flex-col items-center justify-center">
          <h3 className="font-semibold text-slate-700 mb-2">Simulate a Purchase</h3>
          <p className="text-sm text-slate-500 text-center mb-4">Generate a fake $49.99 sale to see your metrics update instantly.</p>
          <button 
            onClick={handleSimulatePurchase}
            disabled={simulating}
            className="bg-findora-green text-white px-6 py-3 rounded-lg font-medium hover:bg-findora-green/90 transition-colors disabled:opacity-50"
          >
            {simulating ? "Processing..." : "💳 Simulate Purchase"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="metric-card relative overflow-hidden">
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</h3>
      <p className="text-xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}