import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      setMessage({ text: 'Logged in successfully!', type: 'success' });
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      setMessage({ text: 'Account created! Check your email to verify.', type: 'success' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-findora-gray flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-findora-purple rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">F</div>
          <h1 className="text-2xl font-bold text-findora-dark">Welcome to Findora</h1>
          <p className="text-slate-500 mt-2 text-sm">Sign in to manage your ad campaigns.</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-findora-purple/20 focus:border-findora-purple"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-findora-purple/20 focus:border-findora-purple"
              placeholder="••••••••"
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              {message.text}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-findora-purple text-white py-2.5 rounded-lg font-medium hover:bg-findora-purple/90 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              Sign In
            </button>
            <button 
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}