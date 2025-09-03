'use client';
import type { SyllabusTask } from '@/lib/types';

export default function ListView({ tasks }: { tasks: SyllabusTask[] }) {
  const sorted = [...tasks].sort((a,b) => a.date.localeCompare(b.date));
  return (
    <div className="bg-white rounded-xl p-4 shadow divide-y">
      {sorted.map((t, i) => (
        <div key={i} className="py-3">
          <div className="text-sm text-gray-500">{t.date}</div>
          <div className="font-medium">{t.title}</div>
          <div className="text-xs uppercase text-gray-400">{t.type}</div>
          {t.notes && <div className="text-sm mt-1">{t.notes}</div>}
        </div>
      ))}
    </div>
  );
}
