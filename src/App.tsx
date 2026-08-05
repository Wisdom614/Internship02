import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import CreateCampaign from './pages/CreateCampaign';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import Search from './pages/Search';
import AdminDashboard from './pages/AdminDashboard'; // <--- Import the Admin Dashboard
import Payments from './pages/Payments';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Create a timeout - if Supabase hangs, we stop loading after 1.5 seconds and show the Search page
    const timeoutId = setTimeout(() => {
      console.warn("Supabase auth timed out. Loading public search page.");
      setLoading(false);
    }, 1500);

    // Attempt to get the session
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeoutId); // Cancel the timeout if Supabase responds
      setSession(session);
      setLoading(false);
    }).catch(() => {
      clearTimeout(timeoutId);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-findora-gray flex items-center justify-center">
        <div className="text-slate-400 flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-findora-purple/30 border-t-findora-purple rounded-full animate-spin"></div>
          <span>Loading Findora...</span>
        </div>
      </div>
    );
  }

  // --- PUBLIC ROUTES --- (No Dashboard/Header/Sidebar)
  if (!session) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // --- LOGGED IN ROUTES --- (Dashboard, Sidebar, Header)
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-findora-gray">
        <Sidebar />
        <div className="min-w-0 flex-1 md:ml-64">
          <Header />
          <main className="p-4 pb-24 sm:p-6 sm:pb-24 md:p-8 md:pb-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/campaigns" element={<CreateCampaign />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/admin" element={<AdminDashboard />} /> {/* <--- The Admin Route */}
              <Route path="/login" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
