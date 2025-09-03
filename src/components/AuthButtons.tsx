// components/AuthButtons.tsx
'use client';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function AuthButtons() {
  const { data: session } = useSession();
  return session ? (
    <button onClick={() => signOut()} className="btn">Sign out</button>
  ) : (
    <button onClick={() => signIn('google')} className="btn">Sign in with Google</button>
  );
}
