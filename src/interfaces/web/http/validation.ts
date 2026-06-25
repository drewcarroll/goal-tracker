import { z } from "zod";

/**
 * Input validation schemas (schema validation only — NO business rules).
 * Business invariants are enforced in the domain layer.
 *
 * NOTE: `userId` is intentionally NOT part of any client-supplied schema. The
 * caller's identity is always derived server-side from the authenticated
 * session (see `getCurrentUserId`), never trusted from request input.
 */
export const createGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  dueDate: z.string().datetime().nullish(),
});

export const updateProgressSchema = z.object({
  progress: z.number().min(0).max(100),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
