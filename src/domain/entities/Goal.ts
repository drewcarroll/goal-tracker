import { GoalAlreadyCompletedError, ValidationError } from "../errors/DomainError";
import { GoalStatus } from "../value-objects/GoalStatus";
import { Progress } from "../value-objects/Progress";

export interface GoalProps {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  progress: Progress;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Goal entity — has identity (id) and a lifecycle.
 * Enforces its own invariants. Knows nothing about persistence or transport.
 */
export class Goal {
  private constructor(private props: GoalProps) {}

  /** Reconstitute an existing Goal (e.g. from a repository). */
  static rehydrate(props: GoalProps): Goal {
    Goal.assertValidTitle(props.title);
    return new Goal(props);
  }

  /** Create a brand new Goal with sensible defaults. */
  static create(params: {
    id: string;
    userId: string;
    title: string;
    description?: string | null;
    dueDate?: Date | null;
    now?: Date;
  }): Goal {
    Goal.assertValidTitle(params.title);
    const now = params.now ?? new Date();
    return new Goal({
      id: params.id,
      userId: params.userId,
      title: params.title.trim(),
      description: params.description?.trim() ?? null,
      status: GoalStatus.active(),
      progress: Progress.zero(),
      dueDate: params.dueDate ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  private static assertValidTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new ValidationError("Goal title must not be empty.");
    }
    if (title.trim().length > 200) {
      throw new ValidationError("Goal title must be 200 characters or fewer.");
    }
  }

  // --- Behavior (business rules live here) ---

  updateProgress(progress: Progress, now: Date = new Date()): void {
    if (this.props.status.isCompleted()) {
      throw new GoalAlreadyCompletedError(this.props.id);
    }
    this.props.progress = progress;
    if (progress.isComplete()) {
      this.props.status = GoalStatus.completed();
    }
    this.props.updatedAt = now;
  }

  complete(now: Date = new Date()): void {
    if (this.props.status.isCompleted()) {
      throw new GoalAlreadyCompletedError(this.props.id);
    }
    this.props.status = GoalStatus.completed();
    this.props.progress = Progress.complete();
    this.props.updatedAt = now;
  }

  archive(now: Date = new Date()): void {
    this.props.status = GoalStatus.archived();
    this.props.updatedAt = now;
  }

  // --- Getters (read-only access to state) ---

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get title(): string {
    return this.props.title;
  }
  get description(): string | null {
    return this.props.description;
  }
  get status(): GoalStatus {
    return this.props.status;
  }
  get progress(): Progress {
    return this.props.progress;
  }
  get dueDate(): Date | null {
    return this.props.dueDate;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
