// src/lib/icsExport.ts
import { createEvents, type EventAttributes, type DateTime } from 'ics';

export type SimpleTask = {
  title: string;
  date: string;              // YYYY-MM-DD
  time?: string | null;      // HH:MM (24h) optional
  description?: string;
  location?: string;
  link?: string;
};

// Mutable tuple types (what `ics` expects)
type DateTuple = [number, number, number];
type DateTimeTuple = [number, number, number, number, number];

function addHour(y: number, m: number, d: number, hh: number, mm: number): DateTimeTuple {
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
  dt.setHours(dt.getHours() + 1);
  // Return a mutable tuple (no `as const`)
  return [dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), dt.getHours(), dt.getMinutes()];
}

function nextDay(y: number, m: number, d: number): DateTuple {
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  dt.setDate(dt.getDate() + 1);
  // Return a mutable tuple
  return [dt.getFullYear(), dt.getMonth() + 1, dt.getDate()];
}

export async function tasksToICSBuffer(tasks: SimpleTask[]): Promise<Buffer> {
  const events: EventAttributes[] = tasks.map((t) => {
    const [yy, mm, dd] = t.date.split('-').map(Number) as [number, number, number];

    if (t.time) {
      const [h, min] = t.time.split(':').map(Number) as [number, number];
      const start: DateTime = [yy, mm, dd, h, min];
      const end: DateTime = addHour(yy, mm, dd, h, min);

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
    const start: DateTime = [yy, mm, dd];
    const end: DateTime = nextDay(yy, mm, dd);

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

  // Calendar header options go here (not on each event)
  const { error, value } = createEvents(events, { calName: 'LawBandit Syllabus' });
  if (error) throw error;
  return Buffer.from(value || '', 'utf8');
}
