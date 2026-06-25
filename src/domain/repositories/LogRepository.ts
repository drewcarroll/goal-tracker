import { LogEntry } from "../entities/LogEntry";

/**
 * Repository interface (a port) for log entries. Describes WHAT persistence
 * operations exist, never HOW they are implemented. Logs are append-only, so
 * the port exposes only insertion. Implementations live in infrastructure.
 */
export interface LogRepository {
  add(entry: LogEntry): Promise<void>;
}
