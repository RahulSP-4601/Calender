// src/lib/icsExport.ts
import { createEvents, type EventAttributes } from 'ics';

export type SimpleTask = {
  title: string;
  date: string;              // YYYY-MM-DD
  time?: string | null;      // HH:MM (24h) optional
  description?: string;
  location?: string;
  link?: string;
};

function addHour(y: number, m: number, d: number, hh: number, mm: number) {
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
  dt.setHours(dt.getHours() + 1);
  return [dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), dt.getHours(), dt.getMinutes()] as const;
}

function nextDay(y: number, m: number, d: number) {
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  dt.setDate(dt.getDate() + 1);
  return [dt.getFullYear(), dt.getMonth() + 1, dt.getDate()] as const;
}

export async function tasksToICSBuffer(tasks: SimpleTask[]): Promise<Buffer> {
  const events: EventAttributes[] = tasks.map((t) => {
    const [yy, mm, dd] = t.date.split('-').map((n) => Number(n)) as [number, number, number];

    if (t.time) {
      const [h, min] = t.time.split(':').map((n) => Number(n)) as [number, number];
      const start: [number, number, number, number, number] = [yy, mm, dd, h, min];
      const end = addHour(yy, mm, dd, h, min);

      const e: EventAttributes = {
        title: t.title,
        start,
        end,
        startInputType: 'local',
        description: t.description,
        location: t.location,
        url: t.link,
      };
      return e;
    }

    // All-day: DTEND should be exclusive (next day)
    const start: [number, number, number] = [yy, mm, dd];
    const end = nextDay(yy, mm, dd);

    const e: EventAttributes = {
      title: t.title,
      start,
      end,
      startInputType: 'local',
      description: t.description,
      location: t.location,
      url: t.link,
    };
    return e;
  });

  // Pass calendar header attributes here (NOT on each event)
  const { error, value } = createEvents(events, { calName: 'LawBandit Syllabus' });
  if (error) throw error;
  // createEvents returns a string; convert to Buffer for download
  return Buffer.from(value);
}
