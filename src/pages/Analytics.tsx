import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Loader2, TrendingUp, DollarSign, MousePointerClick, ShoppingBag } from 'lucide-react';

const COLORS = ['#6C5CE7', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [totals, setTotals] = useState({ clicks: 0, conversions: 0, revenue: 0, cost: 0 });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch aggregated daily stats
    const { data: dailyData, error: dailyError } = await supabase
      .from('statistics')
      .select('*')
      .eq('campaigns.user_id', user.id)
      .order('date', { ascending: true });

    if (dailyError) {
      console.error(dailyError);
      setLoading(false);
      return;
    }

    // 2. Calculate totals
    let totalClicks = 0, totalConvs = 0, totalRev = 0, totalCost = 0;
    dailyData?.forEach(day => {
      totalClicks += day.clicks || 0;
      totalConvs += day.conversions || 0;
      totalRev += day.revenue || 0;
      totalCost += day.cost || 0;
    });

    setDailyStats(dailyData || []);
    setTotals({ clicks: totalClicks, conversions: totalConvs, revenue: totalRev, cost: totalCost });
    setLoading(false);
  };

  // Calculate ROAS
  const roas = totals.cost > 0 ? ((totals.revenue / totals.cost) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-findora-dark">Advanced Analytics</h1>
        <button 
          onClick={fetchAnalytics}
          className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-200 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-findora-purple" size={32} />
        </div>
      ) : dailyStats.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
          <TrendingUp className="mx-auto text-slate-300 mb-3" size={48} />
          <h3 className="text-lg font-medium text-slate-600">No data yet</h3>
          <p className="text-slate-400 text-sm">Start driving traffic to your campaigns to see analytics here.</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard title="Total Clicks" value={totals.clicks.toLocaleString()} icon={MousePointerClick} />
            <MetricCard title="Conversions" value={totals.conversions.toLocaleString()} icon={ShoppingBag} />
            <MetricCard title="Total Revenue" value={`$${totals.revenue.toFixed(2)}`} icon={DollarSign} />
            <MetricCard title="ROAS" value={`${roas.toFixed(2)}%`} icon={TrendingUp} />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Line Chart (Daily Performance) */}
            <div className="chart-container lg:col-span-2 h-80">
              <h3 className="font-semibold text-slate-700 mb-4">Daily Revenue & Clicks</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis yAxisId="left" tick={{fontSize: 12}} />
                  <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12}} />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue ($)" />
                  <Line yAxisId="right" type="monotone" dataKey="clicks" stroke="#6C5CE7" strokeWidth={2} name="Clicks" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart (Conversion vs Non-Conversion) */}
            <div className="chart-container h-80 flex flex-col items-center justify-center">
              <h3 className="font-semibold text-slate-700 mb-4">Conversion Rate</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Conversions', value: totals.conversions },
                      { name: 'Non-Conversions', value: Math.max(totals.clicks - totals.conversions, 0) }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700">Daily Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Clicks</th>
                    <th className="px-6 py-3">Conversions</th>
                    <th className="px-6 py-3">Revenue</th>
                    <th className="px-6 py-3">Cost</th>
                    <th className="px-6 py-3 text-right">ROAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyStats.slice().reverse().map((day) => {
                    const dayRoas = day.cost > 0 ? ((day.revenue / day.cost) * 100) : 0;
                    return (
                      <tr key={day.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-700">{day.date}</td>
                        <td className="px-6 py-4">{day.clicks || 0}</td>
                        <td className="px-6 py-4">{day.conversions || 0}</td>
                        <td className="px-6 py-4 text-findora-green font-medium">${(day.revenue || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-findora-red font-medium">${(day.cost || 0).toFixed(2)}</td>
                        <td className={`px-6 py-4 text-right font-medium ${dayRoas > 100 ? 'text-findora-green' : 'text-findora-red'}`}>
                          {dayRoas.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon: Icon }: any) {
  return (
    <div className="metric-card">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-findora-purple/10 rounded-lg text-findora-purple">
          <Icon size={20} />
        </div>
      </div>
      <h3 className="text-sm font-medium text-slate-500">{title}</h3>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}