import { Bell, User } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-800">Findora Dashboard</h2>
      </div>
      <div className="flex items-center gap-6">
        <button className="text-slate-500 hover:text-findora-purple"><Bell size={20} /></button>
        <button className="w-9 h-9 rounded-full bg-findora-purple text-white flex items-center justify-center"><User size={18} /></button>
      </div>
    </header>
  );
}