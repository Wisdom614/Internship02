import { Bell, CalendarDays, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Header() {
  const [dateRange] = useState('Last 7 days');
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  return (
    <header className="bg-white border-b border-slate-200 min-h-20 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 gap-3">
      <div>
        <p className="text-sm text-slate-500">Advertiser Dashboard</p>
        <h2 className="text-xl font-semibold text-slate-800">Performance overview</h2>
      </div>
      <div className="flex items-center gap-4">
        <button className="hidden sm:inline-flex items-center gap-2 text-slate-600 border border-slate-200 rounded-full px-4 py-2 hover:border-findora-purple hover:text-findora-purple transition-colors">
          <CalendarDays size={18} />
          <span>{dateRange}</span>
        </button>
        <button className="hidden sm:block text-slate-500 hover:text-findora-purple" aria-label="Notifications"><Bell size={20} /></button>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-findora-red/10 text-findora-red hover:bg-findora-red/20 transition-colors"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline text-sm font-medium">Log out</span>
        </button>
      </div>
    </header>
  );
}
