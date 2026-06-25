import { ValidationError } from "../errors/DomainError";
import {
  ProjectionService,
  type Projection,
  type WeeklyLogEntry,
} from "../services/ProjectionService";
import { SessionTimeframe } from "../value-objects/SessionTimeframe";
import { LogEntry } from "./LogEntry";

export interface GoalProps {
  id: string;
  userId: string;
  /** Identity of the goal's one-to-one session (its [start, end) window). */
  sessionId: string;
  name: string;
  /** The numeric target the user is working toward (e.g. 12). Always > 0. */
  targetValue: number;
  /** Freeform unit the target is measured in (e.g. "books", "km"). */
  unit: string;
  /** The timeframe the goal is pursued over. */
  timeframe: SessionTimeframe;
  /** Values logged against the goal, attributed to weeks of its session. */
  logs: ReadonlyArray<WeeklyLogEntry>;
  createdAt: Date;
  updatedAt: Date;
}

/** The mutable fields a user can supply when creating or editing a goal. */
interface GoalDetails {
  name: string;
  targetValue: number;
  unit: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Goal entity — has identity (id) and a lifecycle.
 * A goal is a measurable target (targetValue + freeform unit) pursued over a
 * single session window. Enforces its own invariants. Knows nothing about
 * persistence or transport.
 */
export class Goal {
  /** Stateless; shared across instances. The engine re-derives on every call. */
  private static readonly projectionService = new ProjectionService();

  private constructor(private props: GoalProps) {}

  /** Reconstitute an existing Goal (e.g. from a repository). */
  static rehydrate(props: GoalProps): Goal {
    Goal.assertValidName(props.name);
    Goal.assertValidTargetValue(props.targetValue);
    Goal.assertValidUnit(props.unit);
    return new Goal(props);
  }

  /** Create a brand new Goal together with its session window. */
  static create(params: {
    id: string;
    userId: string;
    sessionId: string;
    name: string;
    targetValue: number;
    unit: string;
    startDate: Date;
    endDate: Date;
    now?: Date;
  }): Goal {
    Goal.assertValidName(params.name);
    Goal.assertValidTargetValue(params.targetValue);
    Goal.assertValidUnit(params.unit);
    const now = params.now ?? new Date();
    return new Goal({
      id: params.id,
      userId: params.userId,
      sessionId: params.sessionId,
      name: params.name.trim(),
      targetValue: params.targetValue,
      unit: params.unit.trim(),
      timeframe: SessionTimeframe.create({ start: params.startDate, end: params.endDate }),
      logs: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Apply user edits to an existing goal, re-validating every invariant. */
  edit(details: GoalDetails, now: Date = new Date()): void {
    Goal.assertValidName(details.name);
    Goal.assertValidTargetValue(details.targetValue);
    Goal.assertValidUnit(details.unit);
    this.props.name = details.name.trim();
    this.props.targetValue = details.targetValue;
    this.props.unit = details.unit.trim();
    this.props.timeframe = SessionTimeframe.create({
      start: details.startDate,
      end: details.endDate,
    });
    this.props.updatedAt = now;
  }

  /**
   * Log a value against this goal. By default the entry is attributed to the
   * week that contains `today` (the current week). Pass `weekIndex` to backfill
   * a specific earlier week — e.g. an entry the user forgot after a week reset.
   *
   * The chosen week must lie within the session and must not be in the future
   * (you cannot log progress for a week that hasn't started). Multiple logs in
   * the same week accumulate — the new entry is appended in memory so a
   * subsequent {@link project} call reflects it immediately. Returns the created
   * entry for the caller to persist.
   */
  logProgress(params: {
    id: string;
    value: number;
    today: Date;
    weekIndex?: number;
    now?: Date;
  }): LogEntry {
    const weekIndex = params.weekIndex ?? this.props.timeframe.weekIndexOn(params.today);
    this.assertWeekLoggable(weekIndex, params.today);

    const entry = LogEntry.create({
      id: params.id,
      goalId: this.props.id,
      userId: this.props.userId,
      weekIndex,
      value: params.value,
      now: params.now,
    });
    this.props.logs = [...this.props.logs, entry.toWeekly()];
    return entry;
  }

  /** Guard that a week can be logged against: in-session and not yet to come. */
  private assertWeekLoggable(weekIndex: number, today: Date): void {
    const totalWeeks = this.props.timeframe.totalWeeks();
    if (!Number.isInteger(weekIndex) || weekIndex < 0 || weekIndex >= totalWeeks) {
      throw new ValidationError(
        `That week is outside the goal's session ` +
          `(the session spans ${totalWeeks} ${totalWeeks === 1 ? "week" : "weeks"}).`,
      );
    }
    // Once the session has ended every week is in the past and open to backfill.
    // While it is running, weeks beyond the current one have not happened yet.
    if (
      this.props.timeframe.phaseOn(today) !== "after" &&
      weekIndex > this.props.timeframe.weekIndexOn(today)
    ) {
      throw new ValidationError("You can't log progress for a week that hasn't started yet.");
    }
  }

  private static assertValidName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError("Goal name must not be empty.");
    }
    if (name.trim().length > 200) {
      throw new ValidationError("Goal name must be 200 characters or fewer.");
    }
  }

  private static assertValidTargetValue(targetValue: number): void {
    if (!Number.isFinite(targetValue)) {
      throw new ValidationError("Target value must be a number.");
    }
    if (targetValue <= 0) {
      throw new ValidationError("Target value must be greater than zero.");
    }
  }

  private static assertValidUnit(unit: string): void {
    if (!unit || unit.trim().length === 0) {
      throw new ValidationError("Unit must not be empty.");
    }
    if (unit.trim().length > 50) {
      throw new ValidationError("Unit must be 50 characters or fewer.");
    }
  }

  // --- Getters (read-only access to state) ---

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get sessionId(): string {
    return this.props.sessionId;
  }
  get name(): string {
    return this.props.name;
  }
  get targetValue(): number {
    return this.props.targetValue;
  }
  get unit(): string {
    return this.props.unit;
  }
  get timeframe(): SessionTimeframe {
    return this.props.timeframe;
  }

  /**
   * The target split evenly across the session's weeks (the per-week rate a
   * user must sustain). Mirrors the weekly target used by the projection.
   */
  weeklyTarget(): number {
    return this.props.targetValue / this.props.timeframe.totalWeeks();
  }

  /**
   * The "what you'll accomplish" projection as of `today`: past weeks count
   * their actual logged totals, while the current and future weeks are assumed
   * to hit at least the weekly target (over-delivery kept as bonus).
   */
  project(today: Date): Projection {
    return Goal.projectionService.project({
      timeframe: this.props.timeframe,
      targetValue: this.props.targetValue,
      today,
      logs: this.props.logs,
    });
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
