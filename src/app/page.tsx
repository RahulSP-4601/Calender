'use client';

import * as React from 'react';
import CalendarView from '@/components/CalendarView';
import ListView from '@/components/ListView';
import Uploader from '@/components/Uploader';
import type { SyllabusTask } from '@/lib/types';
import { useSession, signIn, signOut } from 'next-auth/react';

const DEFAULT_CLASS_ID = 'general';

type SyncRow = {
  id?: string;
  status: 'inserted' | 'updated' | 'error';
  htmlLink?: string;
  message?: string;
};

export default function Home() {
  const { data: session } = useSession();

  const [tasks, setTasks] = React.useState<SyllabusTask[]>([]);
  const [mode, setMode] = React.useState<'calendar' | 'list'>('calendar');
  const [loading, setLoading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [calendarUrl, setCalendarUrl] = React.useState<string | null>(null);
  const [firstEventLink, setFirstEventLink] = React.useState<string | null>(null);

  const onStart = () => { setLoading(true); setMessage('Parsing syllabus…'); setTasks([]); };
  const onError = (msg: string) => { setLoading(false); setMessage(msg || 'Failed to parse.'); };

  const onParsed = (incoming: SyllabusTask[]) => {
    setLoading(false);
    const seen = new Set<string>();
    const deduped = incoming.filter(t => {
      const cid = (t as any).classId || DEFAULT_CLASS_ID;
      const k = `${cid}|${t.date}|${(t.title || '').toLowerCase()}`;
      if (seen.has(k)) return false; seen.add(k); return true;
    });
    setTasks(deduped);
    setMessage(`${deduped.length} tasks parsed`);
  };

  async function downloadICS() {
    if (!tasks.length) return;
    try {
      const r = await fetch('/api/ics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tasks),
      });
      if (!r.ok) throw new Error('ICS generation failed');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `lawbandit-${DEFAULT_CLASS_ID}.ics`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { setMessage(e?.message || 'Failed to download ICS'); }
  }

  // Force re-consent + choose account (fixes 403 after scope changes)
  async function reconnectGoogle() {
    // Clear NextAuth session cookie
    await signOut({ redirect: false });
    // Open Google consent again with the right scope + force account selection
    await signIn('google', {
      callbackUrl: '/',                 // back to the app after consent
      prompt: 'consent select_account', // force consent + account picker
    });
  }

  async function syncToGoogle() {
    if (!tasks.length) return;

    // If not authenticated, start Google sign-in (with consent)
    if (!session) {
      await signIn('google', { callbackUrl: '/', prompt: 'consent select_account' });
      return;
    }

    try {
      setSyncing(true);
      setMessage('Syncing to Google Calendar…');
      setCalendarUrl(null);
      setFirstEventLink(null);

      const res = await fetch('/api/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      const data = await res.json();
      console.log('Google sync result:', data);

      if (!res.ok) {
        setMessage(data?.error || 'Google sync failed');
        return;
      }

      const results: SyncRow[] = Array.isArray(data?.results) ? data.results : [];
      const inserted = results.filter(r => r.status === 'inserted').length;
      const updated  = results.filter(r => r.status === 'updated').length;
      const errored  = results.filter(r => r.status === 'error');

      if (errored.length) {
        const firstErr = errored[0]?.message || 'Unknown error';
        setMessage(
          `Synced with errors — ${inserted} inserted, ${updated} updated, ${errored.length} failed. First error: ${firstErr}`
        );
      } else {
        setMessage(`Synced to Google Calendar — ${inserted} inserted, ${updated} updated.`);
      }

      setCalendarUrl(data?.calendarUrl ?? null);
      setFirstEventLink(results.find(r => !!r.htmlLink)?.htmlLink ?? null);
    } catch (err: any) {
      setMessage(err?.message || 'Google sync failed');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(60%_40%_at_20%_0%,#1f254d33_0%,transparent_70%),radial-gradient(50%_40%_at_100%_0%,#4f46e533_0%,transparent_70%)]">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 backdrop-blur supports-backdrop-blur:bg-white/5 bg-black/30 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            <span className="text-white">LawBandit</span>
            <span className="mx-2 text-white/50">—</span>
            <span className="text-white/90">Syllabus → Calendar</span>
          </h1>

          <div className="flex items-center gap-2">
            {/* Auth status + controls */}
            {session?.user?.email ? (
              <span className="hidden sm:inline text-xs text-white/60 mr-2">
                Signed in as {session.user.email}
              </span>
            ) : null}
            <button
              onClick={reconnectGoogle}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-white/90 hover:bg-white/20"
              title="Sign out and re-connect Google (forces consent & account picker)"
            >
              Reconnect Google
            </button>

            <button
              disabled={!tasks.length}
              onClick={downloadICS}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-white/90 hover:bg-white/20 disabled:opacity-40"
            >
              Export .ics
            </button>

            <button
              onClick={syncToGoogle}
              disabled={!tasks.length || syncing}
              className="rounded-xl border border-brand-500/40 bg-brand-500/15 px-3 py-1.5 text-sm text-brand-50 hover:bg-brand-500/25 disabled:opacity-40"
              title={!session ? 'Sign in with Google to sync' : 'Sync to your Google Calendar'}
            >
              {!session ? 'Sign in with Google' : (syncing ? 'Syncing…' : 'Sync to Google')}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Upload card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <Uploader
            classId={DEFAULT_CLASS_ID}
            onStart={onStart}
            onParsed={onParsed}
            onError={onError}
            loading={loading}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className={`text-sm ${
              message?.toLowerCase().includes('fail') || message?.toLowerCase().includes('error')
                ? 'text-red-400'
                : 'text-white/70'
            }`}>
              {message ?? 'Upload a syllabus PDF to generate tasks.'}
            </p>
            {calendarUrl && (
              <a
                href={calendarUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
              >
                Open Google Calendar
              </a>
            )}
            {firstEventLink && (
              <a
                href={firstEventLink}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
              >
                Open a Synced Event
              </a>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMode('calendar')}
              className={`px-3 py-1.5 rounded-xl text-sm border ${
                mode === 'calendar'
                  ? 'border-white/15 bg-white/20'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setMode('list')}
              className={`px-3 py-1.5 rounded-xl text-sm border ${
                mode === 'list'
                  ? 'border-white/15 bg-white/20'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              List
            </button>
            <button
              onClick={() => { setTasks([]); setMessage(null); setCalendarUrl(null); setFirstEventLink(null); }}
              disabled={!tasks.length}
              className="px-3 py-1.5 rounded-xl text-sm border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Results */}
        {!tasks.length ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center text-white/50">
            Your calendar will appear here after parsing.
          </div>
        ) : mode === 'calendar' ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <CalendarView tasks={tasks} />
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <ListView tasks={tasks} />
          </div>
        )}
      </section>
    </main>
  );
}
