import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { emailVerification } from '../services/emailVerification';
import { supabase } from '../lib/supabase';

export default function VerifyEmail() {
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address…');
  const navigate = useNavigate();

  useEffect(() => {
    const verify = async () => {
      const token = new URLSearchParams(window.location.search).get('token');
      
      if (!token) {
        setState('error');
        setMessage('This verification link is missing its token.');
        return;
      }

      try {
        // 1. Verify with your custom email API
        const result = await emailVerification.verify(token);
        
        if (!result.success) {
          throw new Error(result.error || 'Verification failed');
        }

        // 2. Update Supabase profile to mark email as verified
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Update the profiles table
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ email_verified: true })
            .eq('id', user.id);
          
          if (updateError) {
            console.warn('Could not update profile:', updateError);
            // Don't fail the verification if profile update fails
          }
        }

        setState('success');
        setMessage('Your email has been verified successfully!');
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/');
        }, 3000);

      } catch (error) {
        setState('error');
        setMessage(error instanceof Error ? error.message : 'Verification failed. Please try again.');
      }
    };

    verify();
  }, [navigate]);

  const icon = state === 'loading' 
    ? <Loader2 className="animate-spin text-[#315f49]" size={28} />
    : state === 'success' 
      ? <CheckCircle2 className="text-[#315f49]" size={28} />
      : <XCircle className="text-red-600" size={28} />;

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7f3] p-5">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_24px_70px_rgba(17,37,29,.08)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e8f2e8]">
          {icon}
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-.04em]">
          Email verification
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#647268]">
          {message}
        </p>
        
        {/* Different buttons based on state */}
        {state === 'success' && (
          <Link 
            to="/" 
            className="mt-7 inline-flex rounded-xl bg-[#173126] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#315f49]"
          >
            Go to Dashboard →
          </Link>
        )}
        
        {state === 'error' && (
          <div className="mt-6 space-y-3">
            <Link 
              to="/login" 
              className="inline-flex rounded-xl bg-[#173126] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#315f49]"
            >
              Return to sign in
            </Link>
            <button 
              onClick={() => {
                void (async () => {
                const email = localStorage.getItem('pendingVerificationEmail') || '';
                if (!email) {
                  setMessage('Enter your email on the sign-up page to request a new verification link.');
                  return;
                }
                const result = await emailVerification.resend(email);
                setMessage(result.success
                  ? 'A new verification email has been sent.'
                  : result.error || 'We could not resend the verification email.');
                })();
              }}
              className="block w-full text-sm text-[#315f49] hover:text-[#173126]"
            >
              Resend verification email
            </button>
          </div>
        )}
        
        {state === 'loading' && (
          <p className="mt-4 text-sm text-[#647268]">Please wait while we confirm your email…</p>
        )}
      </section>
    </main>
  );
}
