import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, CircleDollarSign, CreditCard, Loader2, ShieldCheck, WalletCards } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Payment = { id: string; amount: number; currency: string; status: string; provider: string; is_test: boolean; created_at: string };

const money = new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amount, setAmount] = useState('5000');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { void loadPayments(); }, []);

  async function loadPayments() {
    setLoading(true);
    const { data, error } = await supabase.from('payments').select('id, amount, currency, status, provider, is_test, created_at').order('created_at', { ascending: false });
    if (error) setMessage('Payments table is not ready. Run supabase/sql/simulated-payments.sql first.');
    else setPayments((data as Payment[]) ?? []);
    setLoading(false);
  }

  async function simulatePayment(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 100) { setMessage('Enter an amount of at least 100 XAF.'); return; }
    setSubmitting(true);
    setMessage('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage('Please sign in again before testing a payment.'); setSubmitting(false); return; }
    const reference = `TEST-${crypto.randomUUID()}`;
    const { error } = await supabase.from('payments').insert({ user_id: user.id, amount: value, currency: 'XAF', status: 'completed', provider: 'simulation', provider_reference: reference, is_test: true });
    if (error) setMessage(error.message);
    else { setMessage(`Test payment of ${money.format(value)} recorded successfully.`); await loadPayments(); }
    setSubmitting(false);
  }

  const balance = payments.filter(payment => payment.status === 'completed').reduce((sum, payment) => sum + Number(payment.amount), 0);
  return <div className="mx-auto max-w-5xl space-y-7 pb-8">
    <section className="rounded-3xl bg-[#173126] px-6 py-8 text-white sm:px-9"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full bg-[#d9ff6c]/15 px-3 py-1.5 text-xs text-[#d9ff6c]"><ShieldCheck size={14} /> Test mode enabled</div><h1 className="mt-4 text-3xl font-semibold tracking-[-.045em]">Payments</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Create test deposits while Fapshi integration is being prepared. These records are simulations only—no money is collected.</p></div><div className="rounded-2xl bg-white/10 px-5 py-4"><p className="text-xs text-white/60">Simulated balance</p><p className="mt-1 text-2xl font-semibold text-[#d9ff6c]">{money.format(balance)}</p></div></div></section>
    <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]"><section className="rounded-2xl border border-[#e0e5de] bg-white p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f2e8] text-[#315f49]"><WalletCards size={20} /></span><div><h2 className="font-semibold">Simulate a payment</h2><p className="text-sm text-[#78847c]">For development and demonstration only.</p></div></div><form onSubmit={simulatePayment} className="mt-6 space-y-4"><label className="block text-sm font-medium text-[#425047]">Amount (XAF)<input value={amount} onChange={event => setAmount(event.target.value)} type="number" min="100" step="100" inputMode="numeric" className="mt-2 w-full rounded-xl border border-[#dce3dc] px-3 py-3 outline-none transition focus:border-[#315f49]" /></label><button disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#173126] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{submitting ? <Loader2 size={17} className="animate-spin" /> : <CreditCard size={17} />} Record test payment</button></form>{message && <p className="mt-4 rounded-xl bg-[#f2f6f0] px-3 py-2.5 text-sm text-[#315f49]">{message}</p>}</section>
      <section className="overflow-hidden rounded-2xl border border-[#e0e5de] bg-white"><div className="flex items-center gap-3 border-b border-[#e9ece8] px-6 py-5"><CircleDollarSign className="text-[#315f49]" size={20} /><div><h2 className="font-semibold">Payment activity</h2><p className="text-sm text-[#78847c]">Your simulated deposits.</p></div></div>{loading ? <div className="px-6 py-12 text-center text-sm text-[#78847c]">Loading payments…</div> : payments.length === 0 ? <div className="px-6 py-12 text-center text-sm text-[#78847c]">No simulated payments yet.</div> : <div className="divide-y divide-[#edf0eb]">{payments.map(payment => <div key={payment.id} className="flex items-center justify-between gap-4 px-6 py-4"><div className="flex min-w-0 items-center gap-3"><CheckCircle2 size={20} className="shrink-0 text-[#315f49]" /><div><p className="font-medium">{payment.is_test ? 'Test payment' : 'Payment'}</p><p className="mt-0.5 text-xs text-[#78847c]">{new Date(payment.created_at).toLocaleString()} · {payment.provider}</p></div></div><p className="font-semibold text-[#173126]">{money.format(Number(payment.amount))}</p></div>)}</div>}</section></div>
  </div>;
}
