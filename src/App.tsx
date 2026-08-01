import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import CreateCampaign from './pages/CreateCampaign';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import Search from './pages/Search';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // FALLBACK: If Supabase hangs for more than 1 second, just show the search page anyway
    const timeoutId = setTimeout(() => {
      console.log("Supabase timed out. Bypassing auth and loading Search.");
      setLoading(false);
    }, 1000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeoutId);
      setSession(session);
      setLoading(false);
    }).catch(() => {
      clearTimeout(timeoutId);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

  // PUBLIC ROUTES
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

  // PRIVATE ROUTES
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-findora-gray">
        <Sidebar />
        <div className="flex-1 ml-64">
          <Header />
          <main className="p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/campaigns" element={<CreateCampaign />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;