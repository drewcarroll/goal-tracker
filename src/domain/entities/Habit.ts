import { ValidationError } from "../errors/DomainError";
import { isValidCatalogId } from "../value-objects/HabitCatalog";
import { LockCostService, type HabitDifficulty } from "../services/LockCostService";

export type { HabitDifficulty } from "../services/LockCostService";
export type HabitState = "active" | "paused" | "formed";

export interface HabitProps {
  id: string;
  userId: string;
  /** Must resolve to an entry in the hardcoded HABIT_CATALOG. */
  catalogId: string;
  difficulty: HabitDifficulty;
  currentLockCost: number;
  state: HabitState;
  createdAt: Date;
}

/**
 * Habit entity — a user's commitment to a catalog habit at a given difficulty,
 * with a lock cost that trends toward 1 (formed) on passed days and up
 * (capped at 50) on failed ones. Has identity and a lifecycle
 * (active -> formed, or active <-> paused). Enforces its own invariants and
 * knows nothing about persistence or transport.
 */
export class Habit {
  private static readonly lockCostService = new LockCostService();

  private constructor(private props: HabitProps) {}

  /** Create a brand new habit at its difficulty's starting lock cost. */
  static create(params: {
    id: string;
    userId: string;
    catalogId: string;
    difficulty: HabitDifficulty;
    now?: Date;
  }): Habit {
    Habit.assertValidCatalogId(params.catalogId);
    const currentLockCost = Habit.lockCostService.initialCostFor(params.difficulty);
    return new Habit({
      id: params.id,
      userId: params.userId,
      catalogId: params.catalogId,
      difficulty: params.difficulty,
      currentLockCost,
      state: "active",
      createdAt: params.now ?? new Date(),
    });
  }

  /** Reconstitute an existing habit (e.g. from a repository). */
  static rehydrate(props: HabitProps): Habit {
    Habit.assertValidCatalogId(props.catalogId);
    Habit.assertValidLockCost(props.currentLockCost);
    return new Habit(props);
  }

  /**
   * Apply a day's check-in result to this habit's lock cost, transitioning it
   * to `formed` once the cost bottoms out at 1. No-op on progression for a
   * paused habit's cost math — callers should not include paused habits in a
   * day's plan, but this method does not itself gate on state.
   */
  applyDayResult(dayResult: "PASS" | "FAIL"): void {
    this.props.currentLockCost = Habit.lockCostService.nextCost(
      this.props.currentLockCost,
      dayResult,
    );
    if (Habit.lockCostService.isFormed(this.props.currentLockCost) && this.props.state === "active") {
      this.props.state = "formed";
    }
  }

  /**
   * Overwrite the lock cost with an already-computed value — used after
   * replaying a habit's check-in history from scratch (e.g. HabitTrajectoryService,
   * following an edit to a past check-in), as opposed to `applyDayResult`'s
   * single incremental step. Re-derives the formed transition both ways: a
   * habit can un-form if a correction pushes its cost back above 1. Leaves a
   * paused habit's pause alone — pausing is a separate, explicit user action.
   */
  recomputeCost(newCost: number): void {
    Habit.assertValidLockCost(newCost);
    this.props.currentLockCost = newCost;
    if (Habit.lockCostService.isFormed(newCost)) {
      if (this.props.state === "active") {
        this.props.state = "formed";
      }
    } else if (this.props.state === "formed") {
      this.props.state = "active";
    }
  }

  /** Pause an active habit — it stops being schedulable in future plans. */
  pause(): void {
    if (this.props.state !== "active") {
      throw new ValidationError(`Cannot pause a habit in state "${this.props.state}".`);
    }
    this.props.state = "paused";
  }

  /** Resume a paused habit. */
  resume(): void {
    if (this.props.state !== "paused") {
      throw new ValidationError(`Cannot resume a habit in state "${this.props.state}".`);
    }
    this.props.state = "active";
  }

  private static assertValidCatalogId(catalogId: string): void {
    if (!isValidCatalogId(catalogId)) {
      throw new ValidationError(`"${catalogId}" is not a recognized habit catalog id.`);
    }
  }

  private static assertValidLockCost(cost: number): void {
    if (!Number.isInteger(cost) || cost < 1 || cost > 50) {
      throw new ValidationError("Habit lock cost must be an integer between 1 and 50.");
    }
  }

  // --- Getters (read-only access to state) ---

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get catalogId(): string {
    return this.props.catalogId;
  }
  get difficulty(): HabitDifficulty {
    return this.props.difficulty;
  }
  get currentLockCost(): number {
    return this.props.currentLockCost;
  }
  get state(): HabitState {
    return this.props.state;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
