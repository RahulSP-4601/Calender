// app/api/auth/[...nextauth]/authOptions.ts
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
          access_type: 'offline',
          prompt: 'consent select_account',
          include_granted_scopes: 'true',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        // persist tokens on the JWT
        (token as any).access_token = account.access_token;
        (token as any).refresh_token =
          (account as any)?.refresh_token ?? (token as any)?.refresh_token;

        // Compute expiry (ms). Prefer provider's absolute expires_at (sec),
        // else derive from expires_in (sec). Fallback to 1 hour.
        const nowSec = Math.floor(Date.now() / 1000);
        const expiresAtSec =
          typeof (account as any)?.expires_at === 'number'
            ? (account as any).expires_at
            : typeof (account as any)?.expires_in === 'number'
            ? nowSec + Number((account as any).expires_in)
            : nowSec + 3600;

        (token as any).expires_at = expiresAtSec * 1000;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).access_token = (token as any).access_token;
      (session as any).refresh_token = (token as any).refresh_token;
      (session as any).expires_at = (token as any).expires_at;
      return session;
    },
  },
};
