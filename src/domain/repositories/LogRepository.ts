import { LogEntry } from "../entities/LogEntry";

/**
 * Repository interface (a port) for log entries. Describes WHAT persistence
 * operations exist, never HOW they are implemented. Implementations live in
 * infrastructure.
 */
export interface LogRepository {
  add(entry: LogEntry): Promise<void>;
  /** A single entry by id, or null if none exists. */
  findById(id: string): Promise<LogEntry | null>;
  /** Every entry recorded against a goal (any week), for history views. */
  findByGoalId(goalId: string): Promise<LogEntry[]>;
  /** Permanently remove an entry. Correcting history is the only way logs change. */
  delete(id: string): Promise<void>;
}
