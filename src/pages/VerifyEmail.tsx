import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Mail, XCircle } from 'lucide-react';
import { emailVerification } from '../services/emailVerification';

type State = 'form' | 'success' | 'error';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>((location.state as { email?: string } | null)?.email ?? localStorage.getItem('pendingVerificationEmail') ?? '');
  const [code, setCode] = useState('');
  const [state, setState] = useState<State>('form');
  const [message, setMessage] = useState('We sent a six-digit verification code to your email address.');
  const [loading, setLoading] = useState(false);

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (!email || code.length !== 6) {
      setState('error');
      setMessage('Enter your email address and the six-digit code.');
      return;
    }
    setLoading(true);
    const result = await emailVerification.verifyOtp(email, code);
    setLoading(false);
    if (!result.success) {
      setState('error');
      setMessage(result.error || 'We could not verify that code.');
      return;
    }
    localStorage.removeItem('pendingVerificationEmail');
    setState('success');
    setMessage('Your email has been verified successfully. You can now sign in.');
  };

  const resend = async () => {
    if (!email) {
      setState('error');
      setMessage('Enter your email address before requesting a new code.');
      return;
    }
    setLoading(true);
    const result = await emailVerification.resend(email);
    setLoading(false);
    setState(result.success ? 'form' : 'error');
    setMessage(result.success ? 'A new verification code has been sent.' : result.error || 'We could not resend the code.');
  };

  const icon = state === 'success'
    ? <CheckCircle2 className="text-[#315f49]" size={28} />
    : state === 'error'
      ? <XCircle className="text-red-600" size={28} />
      : <Mail className="text-[#315f49]" size={28} />;

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7f3] p-5">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_24px_70px_rgba(17,37,29,.08)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e8f2e8]">{icon}</div>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-.04em]">Verify your email</h1>
        <p className="mt-3 text-sm leading-6 text-[#647268]">{message}</p>

        {state === 'success' ? (
          <Link to="/login" className="mt-7 inline-flex rounded-xl bg-[#173126] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#315f49]">
            Sign in to Findora
          </Link>
        ) : (
          <form onSubmit={verify} className="mt-7 space-y-4 text-left">
            <label className="block text-sm font-semibold text-[#36463d]">Email address
              <input type="email" required value={email} onChange={event => setEmail(event.target.value)} className="auth-field mt-2" autoComplete="email" />
            </label>
            <label className="block text-sm font-semibold text-[#36463d]">Verification code
              <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} placeholder="123456" className="auth-field mt-2 text-center text-xl tracking-[.4em]" />
            </label>
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173126] py-3.5 text-sm font-semibold text-white disabled:opacity-60">
              {loading && <Loader2 className="animate-spin" size={18} />} Verify code
            </button>
          </form>
        )}

        {state !== 'success' && <button type="button" onClick={() => void resend()} disabled={loading} className="mt-5 text-sm font-medium text-[#315f49] disabled:opacity-60">Resend code</button>}
        {state !== 'success' && <button type="button" onClick={() => navigate('/login')} className="ml-5 mt-5 text-sm text-[#647268]">Return to sign in</button>}
      </section>
    </main>
  );
}
