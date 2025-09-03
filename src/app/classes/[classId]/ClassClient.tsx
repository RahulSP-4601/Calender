// src/app/classes/[classId]/ClassClient.tsx
'use client';

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import type { SyllabusTask } from '@/lib/types';
import CalendarView from '@/components/CalendarView';
import ListView from '@/components/ListView';
import FileDrop from '@/components/FileDrop';

export default function ClassClient({ classId }: { classId: string }) {
  const [tasks, setTasks] = useState<SyllabusTask[]>([]);
  const [mode, setMode] = useState<'calendar' | 'list'>('calendar');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Accept parsed tasks from FileDrop, with lightweight dedupe
  const handleParsed = useCallback((incoming: SyllabusTask[]) => {
    setErrMsg(null);
    setLoading(false);
    const seen = new Set<string>();
    const merged = incoming.filter(t => {
      const key = `${t.classId}|${t.date}|${t.title.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setTasks(merged);
  }, []);

  // Expose a hook to let FileDrop show a spinner text if you want later
  const handleParseStart = useCallback(() => {
    setLoading(true);
    setErrMsg(null);
    setTasks([]);
  }, []);

  // If FileDrop surfaces an error (non-2xx / schema fail), show it
  const handleParseError = useCallback((message: string) => {
    setLoading(false);
    setErrMsg(message || 'Failed to parse syllabus.');
  }, []);

  // Download ICS via /api/ics
  const downloadICS = useCallback(async () => {
    if (!tasks.length) return;
    try {
      const res = await fetch('/api/ics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tasks),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `ICS generation failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lawbandit-${classId}-syllabus.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErrMsg(e?.message || 'Failed to download ICS.');
    }
  }, [tasks, classId]);

  const taskCount = tasks.length;
  const headerNote = useMemo(() => {
    if (loading) return 'Parsing PDF…';
    if (errMsg) return errMsg;
    if (!taskCount) return 'Upload a syllabus PDF to generate tasks.';
    return `${taskCount} tasks parsed`;
  }, [loading, errMsg, taskCount]);

  return (
    <main className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Class: {classId}</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{headerNote}</span>
          <div className="h-6 w-px bg-gray-300 mx-1" />
          <button
            onClick={() => setMode('calendar')}
            className={`px-3 py-1 border rounded ${mode === 'calendar' ? 'bg-gray-100' : ''}`}
          >
            Calendar
          </button>
          <button
            onClick={() => setMode('list')}
            className={`px-3 py-1 border rounded ${mode === 'list' ? 'bg-gray-100' : ''}`}
          >
            List
          </button>
          <button
            onClick={downloadICS}
            disabled={!taskCount}
            className="px-3 py-1 border rounded disabled:opacity-50"
            title={taskCount ? 'Export .ics' : 'No tasks yet'}
          >
            Export .ics
          </button>
          <button
            onClick={() => setTasks([])}
            disabled={!taskCount}
            className="px-3 py-1 border rounded disabled:opacity-50"
            title="Clear tasks"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Upload */}
      <div className="flex items-center gap-3">
        <FileDrop
          classId={classId}
          onParsed={handleParsed}
          // Optional: if you want, wire these in your FileDrop to call on start/error:
          // onStart={handleParseStart}
          // onError={handleParseError}
        />
      </div>

      {/* Feedback */}
      {errMsg && (
        <p className="text-sm text-red-600">
          {errMsg}
        </p>
      )}

      {/* Results */}
      {!taskCount ? (
        <p className="text-gray-600">Upload a syllabus PDF to generate tasks.</p>
      ) : mode === 'calendar' ? (
        <CalendarView tasks={tasks} />
      ) : (
        <ListView tasks={tasks} />
      )}
    </main>
  );
}
