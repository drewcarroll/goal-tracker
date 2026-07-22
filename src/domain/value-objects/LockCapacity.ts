/**
 * The daily key budget: the combined lock cost of a single day's SCHEDULED
 * goals must fit inside it. This is the forced-focus mechanic
 * (docs/lock-formula.md §3.5) — you can create and activate as many goals as
 * you want, but only this much of them can be scheduled on any one day, so
 * a struggling portfolio (costs rising from misses) forces a real decision
 * at planning time: which goals actually make tonight's cut.
 *
 * Not checked at goal creation/resume time (2026-07-21, user decision:
 * "I should be able to add every goal I ever want ever, but I can only
 * actually SCHEDULE THEM unless I have budget for it") — only at
 * scheduling time, in `CreateDailyPlanUseCase`.
 */
export const DAILY_LOCK_BUDGET = 100;
