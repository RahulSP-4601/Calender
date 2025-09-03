import { z } from 'zod';

export const TaskSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['assignment','reading','exam','other']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  notes: z.string().optional(),
  sourcePage: z.number().int().positive().optional(),
  classId: z.string().min(1),
  tz: z.string().optional(),
});
export const PayloadSchema = z.object({ tasks: z.array(TaskSchema) });
export type Payload = z.infer<typeof PayloadSchema>;
