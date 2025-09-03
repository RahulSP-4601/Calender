import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import type { JWT } from 'next-auth/jwt';

type AugmentedJWT = JWT & {
  access_token?: string;
  refresh_token?: string;
  /** milliseconds since epoch */
  expires_at?: number;
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            'openid email profile https://www.googleapis.com/auth/calendar.events',
          access_type: 'offline',
          prompt: 'consent select_account',
          include_granted_scopes: 'true',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      const t = token as AugmentedJWT;

      if (account) {
        // persist tokens on the JWT
        t.access_token = (account as any)?.access_token ?? t.access_token;
        t.refresh_token = (account as any)?.refresh_token ?? t.refresh_token;

        // Compute expiry (ms). Prefer absolute expires_at (sec),
        // else derive from expires_in (sec). Fallback to 1 hour.
        const nowSec = Math.floor(Date.now() / 1000);
        let expiresAtSec: number;

        if (typeof (account as any)?.expires_at === 'number') {
          expiresAtSec = (account as any).expires_at as number;
        } else if (typeof (account as any)?.expires_in === 'number') {
          expiresAtSec = nowSec + Number((account as any).expires_in);
        } else {
          expiresAtSec = nowSec + 3600;
        }

        t.expires_at = expiresAtSec * 1000;
      }

      return t;
    },

    async session({ session, token }) {
      const t = token as AugmentedJWT;
      (session as any).access_token = t.access_token;
      (session as any).refresh_token = t.refresh_token;
      (session as any).expires_at = t.expires_at;
      return session;
    },
  },
};
