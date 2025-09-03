'use client';
import type { SyllabusTask } from '@/lib/types';

export default function ListView({ tasks }: { tasks: SyllabusTask[] }) {
  const sorted = [...tasks].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="divide-y divide-white/10">
      {sorted.map((t, i) => (
        <div key={`${t.date}-${t.title}-${i}`} className="py-3">
          <div className="text-xs text-white/50">{t.date}</div>

          {/* Make titles feel selectable to trigger the Interpret bubble */}
          <div
            className="font-medium text-white/90 select-text cursor-text"
            title="Select any words and click “Explain”"
          >
            {t.title}
          </div>
        </div>
      ))}
    </div>
  );
}
