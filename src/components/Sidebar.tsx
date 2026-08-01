import { BarChart3, CircleHelp, LayoutDashboard, Megaphone, Search, Settings, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const navigation = [
  { icon: LayoutDashboard, label: 'Overview', path: '/' },
  { icon: Megaphone, label: 'Campaigns', path: '/campaigns' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
];

export default function Sidebar() {
  const location = useLocation();
  return <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-[#173126] px-3 py-4 text-white md:flex">
    <Link to="/" className="flex items-center gap-2.5 px-3 py-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d9ff6c] text-lg font-black text-[#173126]">F</span><span className="text-lg font-semibold tracking-[-.04em]">findora</span></Link>
    <div className="my-6 px-3"><p className="text-[10px] font-bold uppercase tracking-[.17em] text-white/40">Workspace</p></div>
    <nav className="space-y-1">{navigation.map(item => <NavItem key={item.path} {...item} active={location.pathname === item.path} />)}</nav>
    <div className="my-6 border-t border-white/10" /><nav><NavItem icon={Settings} label="Settings" path="/settings" active={location.pathname === '/settings'} /></nav>
    <div className="mt-auto space-y-3 px-2"><div className="rounded-2xl bg-white/[.07] p-3.5"><Sparkles size={17} className="text-[#d9ff6c]" /><p className="mt-3 text-sm font-semibold">Need a hand?</p><p className="mt-1 text-xs leading-5 text-white/55">Get practical help setting up your first campaign.</p><button className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#d9ff6c]">Open guide <CircleHelp size={14} /></button></div><Link to="/" className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white/55 transition hover:text-white"><Search size={15} /> Explore Findora</Link></div>
  </aside>;
}

function NavItem({ icon: Icon, label, path, active }: { icon: any; label: string; path: string; active: boolean }) { return <Link to={path} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active ? 'bg-[#d9ff6c] text-[#173126] shadow-sm' : 'text-white/65 hover:bg-white/[.07] hover:text-white'}`}><Icon size={18} strokeWidth={active ? 2.4 : 2} />{label}</Link>; }
