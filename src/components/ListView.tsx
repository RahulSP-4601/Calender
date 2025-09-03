'use client';
import type { SyllabusTask } from '@/lib/types';

export default function ListView({ tasks }: { tasks: SyllabusTask[] }) {
  const sorted = [...tasks].sort((a,b) => a.date.localeCompare(b.date));
  return (
    <div className="divide-y divide-white/10">
      {sorted.map((t, i) => (
        <div key={i} className="py-3">
          <div className="text-xs text-white/50">{t.date}</div>
          <div className="font-medium text-white/90">{t.title}</div>
          <div className="text-[11px] uppercase tracking-wide text-white/40">{t.type}</div>
          {t.notes && <div className="text-sm mt-1 text-white/70">{t.notes}</div>}
        </div>
      ))}
    </div>
  );
}
