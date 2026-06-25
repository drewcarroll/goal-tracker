import { z } from "zod";

/**
 * Input validation schemas (schema validation only — NO business rules).
 * Business invariants are enforced in the domain layer.
 */
export const createGoalSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  dueDate: z.string().datetime().nullish(),
});

export const updateProgressSchema = z.object({
  progress: z.number().min(0).max(100),
});

export const userIdQuerySchema = z.object({
  userId: z.string().uuid(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
