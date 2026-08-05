import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { emailVerification } from '../services/emailVerification';

type AuthMode = 'signin' | 'signup' | 'reset';
type Message = { text: string; type: 'success' | 'error' } | null;

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  if (error && typeof error === 'object') {
    const details = error as Record<string, unknown>;
    for (const key of ['message', 'detail', 'error_description', 'error']) {
      if (typeof details[key] === 'string' && details[key]) return details[key] as string;
    }
  }
  return 'We could not complete that request. Please try again.';
}

export default function Login() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const isCreatingAccount = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isCreatingAccount.current) setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session) return <Navigate to="/" replace />;

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    
    if (mode === 'signup' && password !== confirmPassword) {
      setMessage({ text: 'The passwords do not match. Please try again.', type: 'error' });
      return;
    }
    
    setLoading(true);
    
    try {
      if (mode === 'signup') {
        isCreatingAccount.current = true;
        // 1. Create user in Supabase (without sending their email)
        const { error: supabaseError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // ⚠️ IMPORTANT: Disable Supabase's email confirmation
            emailRedirectTo: undefined,
          }
        });
        
        if (supabaseError) throw supabaseError;
        
        // 2. Send verification email using YOUR API
        const result = await emailVerification.send(email);
        
        if (!result.success) {
          console.error('Failed to send verification email:', result.error);
          setMessage({
            text: `Your account was created, but we could not send the verification email: ${result.error || 'Unknown error'}. Please try again later.`,
            type: 'error'
          });
          return;
        }

        // A Supabase project with email confirmation disabled creates a session
        // immediately. Sign it out so this user must verify before they can use
        // the application.
        await supabase.auth.signOut();
        isCreatingAccount.current = false;
        
        navigate('/verify', { state: { email } });
        
      } else if (mode === 'signin') {
        // Check verification status using your API before signing in.
        const status = await emailVerification.checkStatus(email);
        
        if (status.success && !status.isVerified) {
          // User exists but email not verified
          setMessage({ 
            text: 'Please verify your email first. Check your inbox or request a new verification link.', 
            type: 'error' 
          });
          setLoading(false);
          return;
        }
        
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        
        setMessage({ text: 'Welcome back. You are signed in.', type: 'success' });
        
      } else {
        // Password reset
        const result = await supabase.auth.resetPasswordForEmail(email, { 
          redirectTo: `${window.location.origin}/login` 
        });
        if (result.error) throw result.error;
        setMessage({ 
          text: 'If an account exists for that email, we sent a recovery link.', 
          type: 'success' 
        });
      }
      
    } catch (error) {
      setMessage({ text: errorMessage(error), type: 'error' });
    } finally {
      isCreatingAccount.current = false;
      setLoading(false);
    }
  };

  // Rest of your component remains the same...
  const content = mode === 'reset'
    ? { eyebrow: 'Account recovery', title: 'Reset your password', subtitle: 'Enter your email and we will send you a secure recovery link.' }
    : mode === 'signin'
      ? { eyebrow: 'Business portal', title: 'Welcome back', subtitle: 'Sign in to manage your campaigns and see what is working.' }
      : { eyebrow: 'Business portal', title: 'Create your account', subtitle: 'Start connecting your business with the right audience.' };

  return (
    <div className="min-h-screen bg-[#f6f7f3] p-3 text-[#17211d] sm:p-5">
      <div className="grid min-h-[calc(100vh-24px)] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_rgba(17,37,29,.08)] sm:min-h-[calc(100vh-40px)] lg:grid-cols-[1.05fr_.95fr]">
        {/* Left sidebar - keep as is */}
        <section className="relative hidden overflow-hidden bg-[#14251e] p-10 text-white lg:flex lg:flex-col xl:p-14">
          <div className="absolute -right-28 -top-16 h-96 w-96 rounded-full bg-[#7dc565]/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#d9ff6c]/15 blur-3xl" />
          <Link to="/" className="relative z-10 flex w-fit items-center gap-2.5">
            <Logo />
            <span className="text-lg font-semibold tracking-[-.04em]">findora</span>
          </Link>
          <div className="relative z-10 my-auto max-w-md pt-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5 text-xs font-medium text-white/70">
              <Sparkles size={14} className="text-[#d9ff6c]" /> Built for considered discovery
            </div>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.04] tracking-[-.055em]">Put your business in the right search.</h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-white/65">Reach people actively looking for what you offer, with a campaign that puts relevance first.</p>
            <div className="mt-10 space-y-4">
              {['Reach high-intent searchers', 'Control your daily campaign budget', 'Get clear, actionable insights'].map(item => (
                <div key={item} className="flex items-center gap-3 text-sm text-white/80">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-[#d9ff6c] text-[#173126]">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-2 text-sm text-white/55">
            <ShieldCheck size={16} className="text-[#d9ff6c]" /> A trusted platform for verified businesses
          </div>
        </section>

        {/* Right side - login form */}
        <section className="flex min-h-[calc(100vh-24px)] flex-col px-6 py-7 sm:px-10 sm:py-10 lg:min-h-0 lg:px-14 xl:px-20">
          <div className="flex items-center justify-between lg:hidden">
            <Link to="/" className="flex items-center gap-2.5">
              <Logo />
              <span className="text-lg font-semibold tracking-[-.04em]">findora</span>
            </Link>
            <BackLink />
          </div>
          <div className="hidden lg:block"><BackLink /></div>
          
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10 lg:py-14">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#5d7567]">{content.eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-.045em]">{content.title}</h1>
            <p className="mt-2 text-sm leading-6 text-[#748078]">{content.subtitle}</p>
            
            {mode !== 'reset' && (
              <div className="mt-8 grid grid-cols-2 rounded-xl bg-[#f1f3ef] p-1" role="tablist" aria-label="Authentication options">
                <AuthTab active={mode === 'signin'} onClick={() => switchMode('signin')}>Sign in</AuthTab>
                <AuthTab active={mode === 'signup'} onClick={() => switchMode('signup')}>Create account</AuthTab>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Field label="Work email" icon={<Mail size={18} />}>
                <input 
                  type="email" 
                  required 
                  autoComplete="email" 
                  value={email} 
                  onChange={event => setEmail(event.target.value)} 
                  placeholder="you@company.com" 
                  className="auth-field" 
                />
              </Field>
              
              {mode !== 'reset' && (
                <Field 
                  label="Password" 
                  icon={<LockKeyhole size={18} />} 
                  action={
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(value => !value)} 
                      className="p-1 text-[#839087] hover:text-[#315f49]" 
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                >
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required 
                    minLength={6} 
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} 
                    value={password} 
                    onChange={event => setPassword(event.target.value)} 
                    placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'} 
                    className="auth-field" 
                  />
                </Field>
              )}
              
              {mode === 'signup' && (
                <Field label="Confirm password" icon={<LockKeyhole size={18} />}>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required 
                    minLength={6} 
                    autoComplete="new-password" 
                    value={confirmPassword} 
                    onChange={event => setConfirmPassword(event.target.value)} 
                    placeholder="Repeat your password" 
                    className="auth-field" 
                  />
                </Field>
              )}
              
              {message && (
                <div 
                  role="alert" 
                  className={`rounded-xl border px-4 py-3 text-sm leading-5 ${
                    message.type === 'error' 
                      ? 'border-red-100 bg-red-50 text-red-700' 
                      : 'border-[#cde5cf] bg-[#edf8ee] text-[#286337]'
                  }`}
                >
                  {message.text}
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={loading} 
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173126] py-3.5 text-sm font-semibold text-white transition hover:bg-[#315f49] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 className="animate-spin" size={18} />}
                {loading ? 'Please wait...' : mode === 'reset' ? 'Send recovery link' : mode === 'signin' ? 'Sign in to dashboard' : 'Create my account'}
              </button>
            </form>
            
            {mode === 'signin' && (
              <button 
                type="button" 
                onClick={() => switchMode('reset')} 
                className="mt-5 text-center text-sm font-medium text-[#315f49] hover:text-[#173126]"
              >
                Forgot your password?
              </button>
            )}
            
            {mode === 'reset' && (
              <button 
                type="button" 
                onClick={() => switchMode('signin')} 
                className="mt-5 inline-flex items-center justify-center gap-1 text-sm font-medium text-[#315f49] hover:text-[#173126]"
              >
                <ArrowLeft size={15} /> Return to sign in
              </button>
            )}
            
            <p className="mt-6 text-center text-xs leading-5 text-[#849088]">
              By continuing, you agree to use Findora responsibly and keep your account details secure.
            </p>
          </div>
          
          <div className="text-center text-xs text-[#849088] lg:text-left">
            Copyright 2026 Findora
          </div>
        </section>
      </div>
    </div>
  );
}

// Helper components (keep as is)
function Logo() { 
  return <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d9ff6c] text-lg font-black text-[#173126]">F</span>; 
}

function BackLink() { 
  return <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-[#587063] hover:text-[#173126]">
    <ArrowLeft size={16} /> Back to search
  </Link>; 
}

function AuthTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { 
  return <button 
    type="button" 
    onClick={onClick} 
    className={`rounded-lg py-2.5 text-sm font-semibold transition ${
      active ? 'bg-white text-[#173126] shadow-sm' : 'text-[#748078] hover:text-[#173126]'
    }`} 
    role="tab" 
    aria-selected={active}
  >
    {children}
  </button>; 
}

function Field({ label, icon, action, children }: { label: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) { 
  return <label className="block">
    <span className="mb-2 block text-sm font-semibold text-[#36463d]">{label}</span>
    <span className="flex items-center rounded-xl border border-[#dce2db] bg-white px-3.5 transition focus-within:border-[#315f49] focus-within:ring-4 focus-within:ring-[#315f49]/10">
      <span className="text-[#839087]">{icon}</span>
      {children}
      {action}
    </span>
  </label>; 
}
