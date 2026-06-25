import { LogEntry } from "@/domain/entities/LogEntry";
import { LogDTO } from "../dtos/LogDTO";

/**
 * Maps log entities <-> DTOs so that domain objects never leak out of the
 * application boundary.
 */
export class LogMapper {
  static toDTO(log: LogEntry): LogDTO {
    return {
      id: log.id,
      goalId: log.goalId,
      weekIndex: log.weekIndex,
      value: log.value,
      createdAt: log.createdAt.toISOString(),
    };
  }
}
