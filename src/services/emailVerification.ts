// src/services/emailVerification.ts
const API_URL = 'https://email-verification-api-852478308269.us-central1.run.app';

interface VerificationResponse {
  success: boolean;
  email?: string;
  isVerified?: boolean;
  error?: string;
  message?: string;
  data?: unknown;
}

interface SendResponse {
  success: boolean;
  error?: string;
  data?: unknown;
}

async function readResponse(response: Response): Promise<Record<string, unknown>> {
  const body = await response.text();

  try {
    return body ? JSON.parse(body) as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function responseMessage(data: Record<string, unknown>, fallback: string): string {
  return typeof data.message === 'string'
    ? data.message
    : typeof data.detail === 'string'
      ? data.detail
      : fallback;
}

export const emailVerification = {
  /**
   * Send verification email to a user
   */
  async send(email: string): Promise<SendResponse> {
    try {
      const response = await fetch(`${API_URL}/request-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await readResponse(response);
      
      if (response.ok && (data.status === 'success' || data.success === true)) {
        // Store email for resend functionality
        localStorage.setItem('pendingVerificationEmail', email);
        return { success: true, data };
      } else {
        return { success: false, error: responseMessage(data, 'Failed to send verification email') };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  },

  /**
   * Verify email with token from the email link
   */
  async verify(token: string): Promise<VerificationResponse> {
    try {
      const response = await fetch(`${API_URL}/verify?token=${encodeURIComponent(token)}`);
      const data = await readResponse(response);
      
      if (response.ok && data.success === true) {
        return { 
          success: true, 
          email: typeof data.email === 'string' ? data.email : undefined,
          isVerified: true,
          message: responseMessage(data, 'Email verified successfully')
        };
      } else {
        return { 
          success: false, 
          error: responseMessage(data, 'Verification failed'),
          isVerified: false 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error',
        isVerified: false 
      };
    }
  },

  /**
   * Check verification status for an email
   */
  async checkStatus(email: string): Promise<VerificationResponse> {
    try {
      const response = await fetch(`${API_URL}/status/${encodeURIComponent(email)}`);
      const data = await readResponse(response);
      
      if (response.ok && data.success === true) {
        return {
          success: true,
          email: typeof data.email === 'string' ? data.email : undefined,
          isVerified: data.is_verified === true,
          message: responseMessage(data, 'Verification status retrieved')
        };
      } else {
        return {
          success: false,
          isVerified: false,
          error: responseMessage(data, 'Failed to check status')
        };
      }
    } catch (error) {
      return {
        success: false,
        isVerified: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  },

  /**
   * Resend verification email
   */
  async resend(email: string): Promise<SendResponse> {
    try {
      const response = await fetch(`${API_URL}/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await readResponse(response);
      
      if (response.ok && (data.status === 'success' || data.success === true)) {
        return { success: true, data };
      } else {
        return { success: false, error: responseMessage(data, 'Failed to resend verification') };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  },

  /**
   * Get token from URL (for the verification page)
   */
  getTokenFromURL(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  }
};
