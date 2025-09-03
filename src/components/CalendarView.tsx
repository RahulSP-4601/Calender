'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import type { SyllabusTask } from '@/lib/types';

type TaskModalProps = {
  task: SyllabusTask | null;
  onClose: () => void;
};

function TaskModal({ task, onClose }: TaskModalProps) {
  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!task) return null;

  // Basic date formatting (fallbacks safe if you only have YYYY-MM-DD)
  const date = new Date(task.date ?? '');
  const dateStr = isNaN(date.getTime())
    ? task.date
    : new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: task.time ? '2-digit' : undefined,
        minute: task.time ? '2-digit' : undefined,
      }).format(date);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      aria-modal
      role="dialog"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h3 className="text-lg font-semibold">Task details</h3>
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-2 py-1 text-sm hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div>
            <div className="text-sm uppercase tracking-wide text-zinc-400">Title</div>
            <div className="mt-1 text-base font-medium">{task.title}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm uppercase tracking-wide text-zinc-400">Date</div>
              <div className="mt-1">{dateStr}</div>
            </div>
          </div>

          {'location' in (task as any) && (task as any).location && (
            <div>
              <div className="text-sm uppercase tracking-wide text-zinc-400">Location</div>
              <div className="mt-1">{(task as any).location}</div>
            </div>
          )}

          {'description' in (task as any) && (task as any).description && (
            <div>
              <div className="text-sm uppercase tracking-wide text-zinc-400">Notes</div>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed text-zinc-200">
                {(task as any).description}
              </p>
            </div>
          )}

          {'link' in (task as any) && (task as any).link && (
            <div>
              <a
                href={(task as any).link}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800"
              >
                Open resource →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CalendarView({ tasks }: { tasks: SyllabusTask[] }) {
  const [openTask, setOpenTask] = useState<SyllabusTask | null>(null);

  const events = useMemo(
    () =>
      tasks.map((t) => ({
        id: `${t.classId}-${t.date}-${t.title}`,
        title: t.title,
        date: t.date,
        backgroundColor: '#ffffff',
        borderColor: '#0a0a0a',
        textColor: '#0a0a0a',
        extendedProps: { task: t }, // keep the full task for modal
      })),
    [tasks]
  );

  const handleEventClick = useCallback((info: any) => {
    const task: SyllabusTask | undefined = info?.event?.extendedProps?.task;
    if (task) setOpenTask(task);
  }, []);

  return (
    <div
      className="rounded-2xl border border-zinc-800/60 p-4 shadow-[0_8px_30px_rgba(0,0,0,.25)] bg-gradient-to-b from-zinc-950 to-zinc-900"
      style={
        {
          ['--fc-page-bg-color' as any]: 'transparent',
          ['--fc-neutral-bg-color' as any]: 'transparent',
          ['--fc-border-color' as any]: 'rgba(255,255,255,.08)',
          ['--fc-button-text-color' as any]: '#0a0a0a',
          ['--fc-button-bg-color' as any]: '#ffffff',
          ['--fc-button-border-color' as any]: '#e5e5e5',
          ['--fc-button-hover-bg-color' as any]: '#f4f4f5',
          ['--fc-button-active-bg-color' as any]: '#e5e5e5',
          ['--fc-today-bg-color' as any]: 'rgba(255,255,255,.06)',
        } as React.CSSProperties
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white/90">Calendar</h3>
        <span className="text-xs text-white/50">{events.length} tasks</span>
      </div>

      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        height="auto"
        fixedWeekCount={false}
        showNonCurrentDates={false}
        firstDay={0}
        headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
        titleFormat={{ year: 'numeric', month: 'long' }}
        buttonText={{ today: 'Today' }}
        events={events}
        dayMaxEventRows={3}
        eventClick={handleEventClick} // << open modal
        eventClassNames={() =>
          '!border !rounded-lg px-2 py-1 text-[12px] leading-4 shadow-sm transition invert-on-hover pill-light'
        }
        eventContent={(arg) => (
          <div className="flex items-center gap-2 truncate">
            <span className="h-2 w-2 shrink-0 rounded-full bg-black" />
            <span className="truncate">{arg.event.title}</span>
          </div>
        )}
      />

      <TaskModal task={openTask} onClose={() => setOpenTask(null)} />

      <style jsx global>{`
        .pill-light {
          background: #ffffff !important;
          color: #0a0a0a !important;
          border-color: #0a0a0a !important;
        }
        .invert-on-hover:hover {
          filter: invert(1);
        }
        .fc .fc-toolbar.fc-header-toolbar {
          margin-bottom: 0.75rem;
        }
        .fc .fc-toolbar-title {
          color: #fafafa;
          font-weight: 700;
          font-size: 1.125rem;
        }
        .fc .fc-button {
          border-radius: 0.75rem;
          padding: 0.4rem 0.8rem;
          text-transform: none;
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.06);
        }
        .fc-theme-standard td,
        .fc-theme-standard th {
          border-color: rgba(255, 255, 255, 0.08);
        }
        .fc .fc-daygrid-day-frame {
          padding: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 0.875rem;
        }
        .fc .fc-daygrid-day-number {
          color: #e5e7eb;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-frame {
          outline: 2px solid rgba(255, 255, 255, 0.25);
          outline-offset: -2px;
        }
      `}</style>
    </div>
  );
}
