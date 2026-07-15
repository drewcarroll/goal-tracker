/**
 * The weekly lock capacity: the combined lock cost of all ACTIVE goals must
 * fit inside it. It is deliberately the same 100 that bounds a single day's
 * plan — your whole active portfolio could, in principle, be scheduled on
 * one day.
 *
 * This is the portfolio-level forced-focus mechanic (docs/lock-formula.md
 * §3.5): costs rise when you miss, so a struggling portfolio grows until it
 * no longer fits, and the week's planning starts with a real decision —
 * pause a goal, delete one, or lower a weekly target (which cuts its price
 * via φ). Creating or resuming a goal is blocked when it would overflow;
 * organic cost growth can push you over, which the UI surfaces as a warning
 * rather than a hard stop.
 */
export const WEEKLY_LOCK_CAPACITY = 100;
