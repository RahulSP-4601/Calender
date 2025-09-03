'use client';

import * as React from 'react';
import CalendarView from '@/components/CalendarView';
import ListView from '@/components/ListView';
import Uploader from '@/components/Uploader';
import type { SyllabusTask } from '@/lib/types';

// Single, neutral class id used internally for tagging uploads
const DEFAULT_CLASS_ID = 'general';

export default function Home() {
  // we keep a class id only to pass to the Uploader; no tabs/UI
  const [tasks, setTasks] = React.useState<SyllabusTask[]>([]);
  const [mode, setMode] = React.useState<'calendar' | 'list'>('calendar');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const onStart = () => { setLoading(true); setMessage('Parsing syllabus…'); setTasks([]); };
  const onError = (msg: string) => { setLoading(false); setMessage(msg || 'Failed to parse.'); };

  const onParsed = (incoming: SyllabusTask[]) => {
    setLoading(false);
    // de-dupe by (classId|date|title) but fall back to DEFAULT_CLASS_ID if missing
    const seen = new Set<string>();
    const deduped = incoming.filter(t => {
      const cid = t.classId || DEFAULT_CLASS_ID;
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
            <button
              disabled={!tasks.length}
              onClick={downloadICS}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-white/90 hover:bg-white/20 disabled:opacity-40"
            >
              Export .ics
            </button>
            <button
              title="Coming soon"
              className="rounded-xl border border-brand-500/40 bg-brand-500/15 px-3 py-1.5 text-sm text-brand-50 hover:bg-brand-500/25"
              onClick={(e) => e.preventDefault()}
            >
              Sync to Google (soon)
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Upload card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <Uploader
            classId={DEFAULT_CLASS_ID}   // << neutral; no Contracts/Torts
            onStart={onStart}
            onParsed={onParsed}
            onError={onError}
            loading={loading}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <p className={`text-sm ${message?.toLowerCase().includes('fail') ? 'text-red-400' : 'text-white/70'}`}>
            {message ?? 'Upload a syllabus PDF to generate tasks.'}
          </p>
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
              onClick={() => { setTasks([]); setMessage(null); }}
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
