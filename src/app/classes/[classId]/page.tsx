// src/app/classes/[classId]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import type { SyllabusTask } from '@/lib/types';
import CalendarView from '@/components/CalendarView';
import ListView from '@/components/ListView';
import FileDrop from '@/components/FileDrop';

export default function ClassPage() {
  const params = useParams<{ classId: string }>();
  const classId = Array.isArray(params.classId) ? params.classId[0] : params.classId;

  const [tasks, setTasks] = useState<SyllabusTask[]>([]);
  const [mode, setMode] = useState<'calendar' | 'list'>('calendar');

  return (
    <main className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Class: {classId}</h1>
        <div className="flex gap-2">
          <button onClick={() => setMode('calendar')} className="px-3 py-1 border rounded">Calendar</button>
          <button onClick={() => setMode('list')} className="px-3 py-1 border rounded">List</button>
        </div>
      </div>

      <FileDrop classId={classId} onParsed={setTasks} />

      {tasks.length === 0 ? (
        <p className="text-gray-600">Upload a syllabus PDF to generate tasks.</p>
      ) : mode === 'calendar' ? (
        <CalendarView tasks={tasks} />
      ) : (
        <ListView tasks={tasks} />
      )}
    </main>
  );
}
