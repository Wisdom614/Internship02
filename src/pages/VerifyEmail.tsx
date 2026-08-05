import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { emailVerification } from '../services/emailVerification';

export default function VerifyEmail() {
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address…');
  useEffect(() => { const token = new URLSearchParams(window.location.search).get('token'); if (!token) { setState('error'); setMessage('This verification link is missing its token.'); return; } void emailVerification.verify(token).then(() => { setState('success'); setMessage('Your email has been verified successfully.'); }).catch(error => { setState('error'); setMessage(error instanceof Error ? error.message : 'Verification failed.'); }); }, []);
  const icon = state === 'loading' ? <Loader2 className="animate-spin text-[#315f49]" size={28} /> : state === 'success' ? <CheckCircle2 className="text-[#315f49]" size={28} /> : <XCircle className="text-red-600" size={28} />;
  return <main className="grid min-h-screen place-items-center bg-[#f6f7f3] p-5"><section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_24px_70px_rgba(17,37,29,.08)]"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e8f2e8]">{icon}</div><h1 className="mt-5 text-2xl font-semibold tracking-[-.04em]">Email verification</h1><p className="mt-3 text-sm leading-6 text-[#647268]">{message}</p><Link to="/login" className="mt-7 inline-flex rounded-xl bg-[#173126] px-5 py-3 text-sm font-semibold text-white">{state === 'success' ? 'Continue to sign in' : 'Return to sign in'}</Link></section></main>;
}
