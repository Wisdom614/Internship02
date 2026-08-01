import { LayoutDashboard, Megaphone, Settings, HelpCircle, BarChart3 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-white h-screen border-r border-slate-200 flex flex-col fixed left-0 top-0 z-20">
      <div className="p-6 flex items-center gap-2 border-b border-slate-100">
        <div className="w-8 h-8 bg-findora-purple rounded-lg flex items-center justify-center text-white font-bold text-xl">F</div>
        <h1 className="text-xl font-bold tracking-tight text-findora-dark">Findora</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <NavItem icon={LayoutDashboard} label="Overview" path="/" currentPath={location.pathname} />
        <NavItem icon={Megaphone} label="Campaigns" path="/campaigns" currentPath={location.pathname} />
        <NavItem icon={BarChart3} label="Analytics" path="/analytics" currentPath={location.pathname} />
        <NavItem icon={Settings} label="Settings" path="/settings" currentPath={location.pathname} />
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button className="flex items-center gap-2 text-slate-500 hover:text-findora-purple transition-colors text-sm">
          <HelpCircle size={18} />
          <span>Support</span>
        </button>
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, path, currentPath }: { icon: any, label: string, path: string, currentPath: string }) {
  const isActive = currentPath === path;
  return (
    <a href={path} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-findora-purple/10 text-findora-purple font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
      <Icon size={20} />
      <span>{label}</span>
    </a>
  );
}