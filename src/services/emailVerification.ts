const API_URL = 'https://email-verification-api-852478308269.us-central1.run.app';

async function request(path: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Email verification service is unavailable.');
  return data;
}

export const emailVerification = {
  async send(email: string) {
    const data = await request('/request-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    if (data.status !== 'success') throw new Error(data.message || 'Unable to send the verification email.');
    return data;
  },
  async verify(token: string) {
    const data = await request(`/verify?token=${encodeURIComponent(token)}`);
    if (!data.success) throw new Error(data.message || 'The verification link is invalid or expired.');
    return data;
  },
  async resend(email: string) {
    const data = await request('/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    if (data.status !== 'success') throw new Error(data.message || 'Unable to resend the verification email.');
    return data;
  },
};
