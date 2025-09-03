import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { tasksToICSBuffer } from '@/lib/icsExport';

const TaskSchema = z.object({
  title: z.string(),
  type: z.enum(['assignment','reading','exam','other']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  notes: z.string().optional(),
  sourcePage: z.number().optional(),
  classId: z.string(),
  tz: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const tasks = z.array(TaskSchema).parse(await req.json());
  const ics = await tasksToICSBuffer(tasks);
  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="lawbandit-syllabus.ics"',
    },
  });
}
