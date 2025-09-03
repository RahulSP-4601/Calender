'use client';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import type { SyllabusTask } from '@/lib/types';

export default function CalendarView({ tasks }: { tasks: SyllabusTask[] }) {
  const events = tasks.map(t => ({
    id: `${t.classId}-${t.date}-${t.title}`,
    title: t.title,
    date: t.date,
  }));
  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <FullCalendar plugins={[dayGridPlugin]} initialView="dayGridMonth" events={events} height="auto" />
    </div>
  );
}
