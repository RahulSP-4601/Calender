// src/app/api/ics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

export const runtime = 'nodejs';

const TaskSchema = z.object({
  title: z.string(),
  date: z.string(), // YYYY-MM-DD
  time: z.string().nullable().optional(), // HH:MM (24h) optional
  description: z.string().optional(),
  location: z.string().optional(),
  link: z.string().optional(),
});

type Task = z.infer<typeof TaskSchema>;

// ---------- ICS helpers ----------
function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toICSDate(dateISO: string): string {
  // YYYY-MM-DD -> YYYYMMDD
  const [y, m, d] = dateISO.split('-').map((s) => parseInt(s, 10));
  return `${y}${pad(m)}${pad(d)}`;
}

function toICSDatetime(dateISO: string, timeHHMM: string): string {
  // Local floating time (no Z, no TZID) -> importing app assumes local tz
  const [y, m, d] = dateISO.split('-').map((s) => parseInt(s, 10));
  const [hh, mm] = timeHHMM.split(':').map((s) => parseInt(s, 10));
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
}

function dtstampUTC(): string {
  const d = new Date();
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function escapeICSText(s: string): string {
  // Escape commas, semicolons, backslashes and newlines
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function uidForTask(t: Task) {
  const key = `${(t.title || '').trim()}|${t.date}|${t.time || ''}`;
  const hex = crypto.createHash('sha1').update(key).digest('hex'); // [a-f0-9]{40}
  return `lb-${hex}@lawbandit`; // UID should be globally unique-ish
}

function eventToICS(t: Task): string[] {
  const lines: string[] = [];
  const isTimed = !!t.time;
  const now = dtstampUTC();
  const uid = uidForTask(t);

  lines.push('BEGIN:VEVENT');
  lines.push(`UID:${uid}`);
  lines.push(`DTSTAMP:${now}`);
  lines.push(`SUMMARY:${escapeICSText(t.title)}`);

  if (t.description) lines.push(`DESCRIPTION:${escapeICSText(t.description)}`);
  if (t.location) lines.push(`LOCATION:${escapeICSText(t.location)}`);
  if (t.link) lines.push(`URL:${escapeICSText(t.link)}`);

  if (isTimed && t.time) {
    // Timed event: default duration 1 hour
    const start = toICSDatetime(t.date, t.time);
    // compute end by +1 hour (rough, local)
    const [hh, mm] = t.time.split(':').map((n) => parseInt(n, 10));
    const dt = new Date(`${t.date}T${pad(hh)}:${pad(mm)}:00`);
    dt.setHours(dt.getHours() + 1);
    const end = `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(
      dt.getDate()
    )}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;

    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
  } else {
    // All-day event: DTEND is exclusive -> next day
    const start = toICSDate(t.date);
    const d = new Date(`${t.date}T00:00:00`);
    d.setDate(d.getDate() + 1);
    const end = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

    lines.push(`DTSTART;VALUE=DATE:${start}`);
    lines.push(`DTEND;VALUE=DATE:${end}`);
  }

  lines.push('END:VEVENT');
  return lines;
}

function foldLines(ics: string): string {
  // Soft-wrap long lines per RFC 5545 (75 octets). Simple UTF-8 safe-ish approach.
  return ics
    .split('\n')
    .flatMap((line) => {
      if (line.length <= 75) return [line];
      const parts: string[] = [];
      let i = 0;
      while (i < line.length) {
        const chunk = line.slice(i, i + 75);
        parts.push(i === 0 ? chunk : ' ' + chunk);
        i += 75;
      }
      return parts;
    })
    .join('\r\n');
}

// ---------- Route ----------
export async function POST(req: NextRequest) {
  const tasks = z.array(TaskSchema).parse(await req.json());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LawBandit//Syllabus to Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const t of tasks) {
    lines.push(...eventToICS(t));
  }

  lines.push('END:VCALENDAR');

  const icsRaw = lines.join('\n');
  const ics = foldLines(icsRaw) + '\r\n';

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="lawbandit-syllabus.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
