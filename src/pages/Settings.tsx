import { Cog, ShieldCheck, Key } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-findora-dark">Settings</h1>
          <p className="text-slate-500 mt-1">Configure your advertiser account and preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-4 text-findora-dark">
            <Cog size={20} />
            <h2 className="font-semibold">Account</h2>
          </div>
          <p className="text-sm text-slate-500">Update your advertiser profile, billing, and notification settings.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-4 text-findora-dark">
            <ShieldCheck size={20} />
            <h2 className="font-semibold">Verification</h2>
          </div>
          <p className="text-sm text-slate-500">Review your site verification status and meta tag instructions.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-4 text-findora-dark">
            <Key size={20} />
            <h2 className="font-semibold">API Keys</h2>
          </div>
          <p className="text-sm text-slate-500">In the future, generate API keys for integrations and reporting.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Support</h2>
        <p className="text-sm text-slate-500">Need help? Please reach out to your Findora customer success team.</p>
      </div>
    </div>
  );
}
