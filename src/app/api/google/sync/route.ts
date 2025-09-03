// app/api/google/sync/route.ts
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { google } from 'googleapis';
import crypto from 'crypto';
import { authOptions } from '../../auth/[...nextauth]/authOptions';

type SyllabusTask = {
  title: string;
  date: string;           // YYYY-MM-DD
  time?: string | null;   // HH:MM (24h) optional
  description?: string;
  location?: string;
  link?: string;
};

// ---- ID helpers -------------------------------------------------------------

// Google is picky about event IDs. Safest charset: [a-z0-9-], length 5–1024.
// Use lowercase hex (40 chars) with a small prefix; no underscores.
function toEventId(t: SyllabusTask) {
  const key = `${(t.title || '').trim()}|${t.date}|${t.time || ''}`;
  const hex = crypto.createHash('sha1').update(key).digest('hex'); // [a-f0-9]{40}
  return `lb-${hex}`; // 43 chars total, all lowercase + dashes
}

// ---- Date helpers -----------------------------------------------------------

function addDays(isoDate: string, days = 1) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function plusOneHour(date: string, time: string) {
  const d = new Date(`${date}T${time}:00`);
  d.setHours(d.getHours() + 1);
  return d.toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS
}

// ---- Mapping ---------------------------------------------------------------

function toGoogleEvent(t: SyllabusTask, tz: string) {
  const id = toEventId(t);
  const hasTime = !!t.time;

  if (hasTime) {
    const startDT = `${t.date}T${t.time}:00`;
    const endDT = plusOneHour(t.date, t.time!); // default 1 hour
    return {
      id,
      summary: t.title,
      description: t.description ?? '',
      location: t.location ?? '',
      source: t.link ? { title: 'Resource', url: t.link } : undefined,
      start: { dateTime: startDT, timeZone: tz },
      end:   { dateTime: endDT,   timeZone: tz },
      reminders: { useDefault: true },
    };
  }

  // All-day: end is exclusive -> next day
  return {
    id,
    summary: t.title,
    description: t.description ?? '',
    location: t.location ?? '',
    source: t.link ? { title: 'Resource', url: t.link } : undefined,
    start: { date: t.date },
    end:   { date: addDays(t.date, 1) },
    reminders: { useDefault: true },
  };
}

// ---- Route -----------------------------------------------------------------

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { tasks, calendarId = 'primary', timeZone } = await req.json();
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return Response.json({ error: 'No tasks' }, { status: 400 });
  }

  const tz =
    timeZone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'America/Chicago';

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2.setCredentials({
    access_token: (session as any).access_token,
    refresh_token: (session as any).refresh_token,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2 });

  const results: Array<{
    id?: string;
    status: 'inserted' | 'updated' | 'error';
    htmlLink?: string;
    message?: string;
  }> = [];

  // Helper: detect "invalid id" style errors so we can fall back
  const isInvalidIdError = (err: any) => {
    const code = err?.code ?? err?.response?.status;
    const msg  = (err?.message || err?.errors?.[0]?.message || '').toLowerCase();
    return code === 400 && (msg.includes('invalid resource id') || msg.includes('invalid id'));
  };

  for (const task of tasks as SyllabusTask[]) {
    const body = toGoogleEvent(task, tz);

    try {
      // 1) Try update (idempotent when id is stable)
      const upd = await calendar.events.update({
        calendarId,
        eventId: body.id!,            // uses our safe id
        requestBody: body,
      });
      results.push({ id: body.id, status: 'updated', htmlLink: upd.data.htmlLink || undefined });
      continue;
    } catch (e: any) {
      const code = e?.code ?? e?.response?.status;

      // 2) If it's 404 (not found) OR 400 invalid id, try to INSERT
      if (code === 404 || isInvalidIdError(e)) {
        try {
          // Some deployments reject client-specified "id" on insert.
          // Use the same body but without id first:
          const { id: _drop, ...insertBody } = body as any;
          const ins = await calendar.events.insert({
            calendarId,
            requestBody: insertBody,
          });
          results.push({ id: body.id, status: 'inserted', htmlLink: ins.data.htmlLink || undefined });
          continue;
        } catch (insErr: any) {
          // 3) Final fallback: events.import allows client-supplied IDs.
          try {
            const imp = await calendar.events.import({
              calendarId,
              requestBody: body,
            });
            results.push({ id: body.id, status: 'inserted', htmlLink: imp.data.htmlLink || undefined });
            continue;
          } catch (impErr: any) {
            const msg =
              impErr?.message ||
              impErr?.errors?.[0]?.message ||
              'insert/import failed';
            results.push({ id: body.id, status: 'error', message: msg });
            continue;
          }
        }
      }

      // Other non-recoverable errors (e.g. 403)
      const friendly =
        code === 403
          ? 'Google returned 403 (insufficient permissions). Revoke access at myaccount.google.com > Security > Third-party access, then sign in again.'
          : e?.message || e?.errors?.[0]?.message || 'update failed';
      results.push({ id: body.id, status: 'error', message: friendly });
    }
  }

  return Response.json({
    ok: true,
    results,
    calendarUrl:
      calendarId === 'primary'
        ? 'https://calendar.google.com/calendar/u/0/r'
        : `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarId)}`,
  });
}
