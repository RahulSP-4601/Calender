import { createEvents } from 'ics';
import type { SyllabusTask } from './types';

export function tasksToICSBuffer(tasks: SyllabusTask[]): Promise<Buffer> {
  const events = tasks.map(t => {
    const [y, m, d] = t.date.split('-').map(Number);
    const start = t.time ? [y, m, d, ...t.time.split(':').map(Number)] : [y, m, d];
    const end = t.endTime ? [y, m, d, ...t.endTime.split(':').map(Number)] : undefined;

    return {
      title: t.title,
      start,
      ...(end ? { end } : {}),
      startInputType: t.time ? 'local' : 'utc',
      description: t.notes ?? '',
      calName: `LawBandit - ${t.classId}`,
    };
  });

  return new Promise((resolve, reject) => {
    createEvents(events, (err, value) => {
      if (err) return reject(err);
      resolve(Buffer.from(value));
    });
  });
}
