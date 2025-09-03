'use client';
import { useState } from 'react';
import type { SyllabusTask } from '@/lib/types';

export default function FileDrop({
  classId,
  onParsed,
}: {
  classId: string;
  onParsed: (tasks: SyllabusTask[]) => void;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <input
        type="file"
        accept="application/pdf"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setLoading(true);
          const form = new FormData();
          form.append('file', file);
          form.append('classId', classId);
          form.append('tz', Intl.DateTimeFormat().resolvedOptions().timeZone);
          const res = await fetch('/api/parse', { method: 'POST', body: form });
          const data = await res.json();
          setLoading(false);
          if (!res.ok) {
            alert('Parse error: ' + (data?.error ?? 'unknown')); console.log(data);
          } else {
            onParsed(data.tasks);
          }
        }}
      />
      {loading && <span className="text-sm text-gray-500">Parsing…</span>}
    </div>
  );
}
