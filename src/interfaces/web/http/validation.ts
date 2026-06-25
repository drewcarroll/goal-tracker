import { z } from "zod";

/**
 * Input validation schemas (schema validation only — NO business rules).
 * Business invariants are enforced in the domain layer (e.g. target > 0,
 * end-after-start). These shape and lightly sanity-check transport input.
 *
 * NOTE: `userId` is intentionally NOT part of any client-supplied schema. The
 * caller's identity is always derived server-side from the authenticated
 * session (see `getCurrentUserId`), never trusted from request input.
 */

/** Accepts either a date-only string ("YYYY-MM-DD") or a full ISO datetime. */
const dateString = z
  .string()
  .min(1, "Date is required")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Must be a valid date");

export const goalInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200, "Name is too long"),
    targetValue: z.coerce
      .number({ invalid_type_error: "Target value must be a number" })
      .finite("Target value must be a number")
      .positive("Target value must be greater than zero"),
    unit: z.string().trim().min(1, "Unit is required").max(50, "Unit is too long"),
    startDate: dateString,
    endDate: dateString,
  })
  .refine((d) => Date.parse(d.endDate) > Date.parse(d.startDate), {
    message: "End date must be after the start date",
    path: ["endDate"],
  });

// Create and update share the same editable fields; the goal id for an update
// comes from the route param / action argument, never the body.
export const createGoalSchema = goalInputSchema;
export const updateGoalSchema = goalInputSchema;

export type GoalInput = z.infer<typeof goalInputSchema>;
