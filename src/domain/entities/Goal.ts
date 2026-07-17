import { ValidationError } from "../errors/DomainError";

export type GoalState = "active" | "paused" | "formed";

const NAME_MAX_LENGTH = 200;
const MIN_WEEKLY_FREQUENCY = 1;
const MAX_WEEKLY_FREQUENCY = 7;

export interface GoalProps {
  id: string;
  userId: string;
  /** Freeform — "Read", "No soda", whatever the user typed. */
  name: string;
  /** How many days a week you're committing to, e.g. 3 for "3x/week". */
  weeklyFrequencyTarget: number;
  currentLockCost: number;
  state: GoalState;
  /** Whether friends can see this goal at all. Defaults to true (public). */
  isPublic: boolean;
  createdAt: Date;
}

/**
 * Goal entity — a single, unified concept for everything you're trying to do
 * regularly: "read 3x/week," "no soda," "exercise." Replaces the old split
 * between a separate numeric-target "Goal" and a catalog-bound "Habit" — one
 * system, one mental model.
 *
 * Has a lock cost that trends toward 1 (formed) on passed days and up
 * (capped at 50) on failed ones — see LockCostService. Has identity and a
 * lifecycle (active -> formed, or active <-> paused). Enforces its own
 * invariants and knows nothing about persistence or transport.
 */
export class Goal {
  private constructor(private props: GoalProps) {}

  /**
   * Create a brand new goal. `initialLockCost` is the uniform starting cost
   * from the CURRENT lock-formula config (a tweakable constant), so the
   * caller computes it via LockCostService.initialCostFor — the entity can't
   * know which config is active (that's an application concern).
   */
  static create(params: {
    id: string;
    userId: string;
    name: string;
    weeklyFrequencyTarget: number;
    initialLockCost: number;
    isPublic?: boolean;
    now?: Date;
  }): Goal {
    Goal.assertValidName(params.name);
    Goal.assertValidWeeklyFrequencyTarget(params.weeklyFrequencyTarget);
    Goal.assertValidLockCost(params.initialLockCost);
    return new Goal({
      id: params.id,
      userId: params.userId,
      name: params.name.trim(),
      weeklyFrequencyTarget: params.weeklyFrequencyTarget,
      currentLockCost: params.initialLockCost,
      state: "active",
      isPublic: params.isPublic ?? true,
      createdAt: params.now ?? new Date(),
    });
  }

  /** Reconstitute an existing goal (e.g. from a repository). */
  static rehydrate(props: GoalProps): Goal {
    Goal.assertValidName(props.name);
    Goal.assertValidWeeklyFrequencyTarget(props.weeklyFrequencyTarget);
    Goal.assertValidLockCost(props.currentLockCost);
    return new Goal(props);
  }

  /** Edit the name, weekly frequency target, and/or privacy. */
  edit(details: { name: string; weeklyFrequencyTarget: number; isPublic: boolean }): void {
    Goal.assertValidName(details.name);
    Goal.assertValidWeeklyFrequencyTarget(details.weeklyFrequencyTarget);
    this.props.name = details.name.trim();
    this.props.weeklyFrequencyTarget = details.weeklyFrequencyTarget;
    this.props.isPublic = details.isPublic;
  }

  /**
   * Overwrite the lock cost with an already-computed value — the ONLY way a
   * goal's cost moves: GoalCostRecomputeService replays the goal's full
   * check-in history through the lock formula and stores the result here
   * (docs/lock-formula.md). Re-derives the formed transition both ways: a
   * goal can un-form if a correction pushes its cost back above 1. Leaves a
   * paused goal's pause alone — pausing is a separate, explicit user action.
   */
  recomputeCost(newCost: number): void {
    Goal.assertValidLockCost(newCost);
    this.props.currentLockCost = newCost;
    if (newCost <= 1) {
      if (this.props.state === "active") {
        this.props.state = "formed";
      }
    } else if (this.props.state === "formed") {
      this.props.state = "active";
    }
  }

  /** Pause an active goal — it stops being schedulable in future plans. */
  pause(): void {
    if (this.props.state !== "active") {
      throw new ValidationError(`Cannot pause a goal in state "${this.props.state}".`);
    }
    this.props.state = "paused";
  }

  /** Resume a paused goal. */
  resume(): void {
    if (this.props.state !== "paused") {
      throw new ValidationError(`Cannot resume a goal in state "${this.props.state}".`);
    }
    this.props.state = "active";
  }

  private static assertValidName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError("Goal name must not be empty.");
    }
    if (name.trim().length > NAME_MAX_LENGTH) {
      throw new ValidationError(`Goal name must be ${NAME_MAX_LENGTH} characters or fewer.`);
    }
  }

  private static assertValidWeeklyFrequencyTarget(target: number): void {
    if (
      !Number.isInteger(target) ||
      target < MIN_WEEKLY_FREQUENCY ||
      target > MAX_WEEKLY_FREQUENCY
    ) {
      throw new ValidationError(
        `Weekly frequency target must be an integer between ${MIN_WEEKLY_FREQUENCY} and ${MAX_WEEKLY_FREQUENCY}.`,
      );
    }
  }

  private static assertValidLockCost(cost: number): void {
    if (!Number.isInteger(cost) || cost < 1 || cost > 50) {
      throw new ValidationError("Goal lock cost must be an integer between 1 and 50.");
    }
  }

  // --- Getters (read-only access to state) ---

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get name(): string {
    return this.props.name;
  }
  get weeklyFrequencyTarget(): number {
    return this.props.weeklyFrequencyTarget;
  }
  get currentLockCost(): number {
    return this.props.currentLockCost;
  }
  get state(): GoalState {
    return this.props.state;
  }
  get isPublic(): boolean {
    return this.props.isPublic;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
