export const syllabusJsonPrompt = (text: string, classId: string, tz: string) => `
You are a precise parser. Extract CALENDAR TASKS from the following law-school syllabus text.
Return STRICT JSON matching this TypeScript type:

type TaskType = "assignment" | "reading" | "exam" | "other";
type Task = {
  title: string;
  type: TaskType;
  date: string;       // ISO: YYYY-MM-DD
  time?: string|null; // HH:mm 24h or null
  endTime?: string|null;
  notes?: string;
  sourcePage?: number;
  classId: string;    // exactly "${classId}"
  tz?: string;        // default "${tz}"
};
{ tasks: Task[] }

Rules:
- Only include items that clearly map to a calendar date (e.g., “Jan 24”, “10/14”).
- Infer the YEAR from context (e.g., “Fall 2025”), otherwise use closest mentioned year.
- Normalize titles (short but informative). Classify type as "reading", "assignment", "exam", or "other".
- If a date has no explicit time, set time and endTime to null.
- If uncertain, exclude the item.
- Output ONLY JSON. No commentary.

SYLLABUS (may be long; summarize content that isn't date-specific):
${text}
`;
