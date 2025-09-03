export type TaskType = 'assignment' | 'reading' | 'exam' | 'other';

export interface SyllabusTask {
  title: string;
  type: TaskType;
  date: string;          // YYYY-MM-DD
  time?: string | null;  // HH:mm
  endTime?: string | null;
  notes?: string;
  sourcePage?: number;
  classId: string;
  tz?: string;
}
