// src/app/api/ics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// Adjust this import path if your helper lives elsewhere:
import { tasksToICSBuffer } from '@/lib/ics';

export const runtime = 'nodejs'; // ensure Node.js runtime for Buffer helpers

const TaskSchema = z.object({
  title: z.string(),
  date: z.string(), // YYYY-MM-DD
  time: z.string().nullable().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  link: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const tasks = z.array(TaskSchema).parse(await req.json());

  // Your helper returns a Node Buffer
  const icsBuf = await tasksToICSBuffer(tasks);

  // Convert Buffer -> ArrayBuffer slice (typed BodyInit for Web Response)
  const body =
    typeof icsBuf === 'string'
      ? icsBuf
      : icsBuf.buffer.slice(icsBuf.byteOffset, icsBuf.byteOffset + icsBuf.byteLength);

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="lawbandit-syllabus.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
