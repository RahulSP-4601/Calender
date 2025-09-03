'use client';

import * as React from 'react';
import type { SyllabusTask } from '@/lib/types';

export default function Uploader({
  classId,
  onParsed,
  onStart,
  onError,
  loading,
}: {
  classId: string;
  onParsed: (tasks: SyllabusTask[]) => void;
  onStart?: () => void;
  onError?: (message: string) => void;
  loading?: boolean;
}) {
  const [dragOver, setDragOver] = React.useState(false);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    onStart?.();
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('classId', classId);
      form.append('tz', Intl.DateTimeFormat().resolvedOptions().timeZone);
      const res = await fetch('/api/parse', { method: 'POST', body: form });
      const ct = res.headers.get('content-type') || '';
      const payload = ct.includes('application/json') ? await res.json() : { error: await res.text() };
      if (!res.ok) {
        onError?.(payload?.error || 'Parse failed');
        return;
      }
      onParsed(payload.tasks as SyllabusTask[]);
    } catch (e: any) {
      onError?.(e?.message || 'Network error');
    }
  }

  return (
    <div
      className={`rounded-2xl border-2 border-dashed p-8 transition ${
        dragOver ? 'border-brand-500/70 bg-brand-500/10' : 'border-white/10 bg-white/5'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <div className="text-sm text-white/80">
            <strong>Upload your syllabus PDF</strong> — drag & drop or choose a file.
          </div>
        </div>

        <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/20 cursor-pointer">
          <input
            type="file"
            className="hidden"
            accept="application/pdf"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {loading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
              <span className="text-white/80">Parsing…</span>
            </>
          ) : (
            <span className="text-white/90">Choose File</span>
          )}
        </label>
      </div>
    </div>
  );
}
