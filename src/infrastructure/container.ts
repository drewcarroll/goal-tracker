import { CreateGoalUseCase } from "@/application/use-cases/CreateGoalUseCase";
import { UpdateGoalUseCase } from "@/application/use-cases/UpdateGoalUseCase";
import { DeleteGoalUseCase } from "@/application/use-cases/DeleteGoalUseCase";
import { ListGoalsUseCase } from "@/application/use-cases/ListGoalsUseCase";
import { LogProgressUseCase } from "@/application/use-cases/LogProgressUseCase";
import { GetProgressDataUseCase } from "@/application/use-cases/GetProgressDataUseCase";
import { GetHistoryUseCase } from "@/application/use-cases/GetHistoryUseCase";
import { DeleteLogUseCase } from "@/application/use-cases/DeleteLogUseCase";
import { getServerSupabaseClient } from "./database/supabaseClient";
import { SupabaseGoalRepository } from "./repositories/SupabaseGoalRepository";
import { SupabaseLogRepository } from "./repositories/SupabaseLogRepository";
import { UuidGenerator } from "./id/UuidGenerator";
import { SystemClock } from "./time/SystemClock";

/**
 * Composition Root.
 *
 * This is the ONLY place where concrete infrastructure implementations
 * are wired to application use cases. Interfaces (route handlers, server
 * actions, pages) import pre-assembled use cases from here so they never
 * touch infrastructure or domain directly.
 *
 * There is no auth service. The id every goal/log is scoped to is derived per
 * request from the signed-in username (see interfaces/web/http/currentUser.ts)
 * and passed into the use cases as `userId`.
 */
function buildContainer() {
  const supabase = getServerSupabaseClient();

  // Infrastructure adapters (implementing domain/application ports).
  const goalRepository = new SupabaseGoalRepository(supabase);
  const logRepository = new SupabaseLogRepository(supabase);
  const idGenerator = new UuidGenerator();
  const clock = new SystemClock();

  // Application use cases.
  return {
    createGoalUseCase: new CreateGoalUseCase(goalRepository, idGenerator, clock),
    updateGoalUseCase: new UpdateGoalUseCase(goalRepository, clock),
    deleteGoalUseCase: new DeleteGoalUseCase(goalRepository),
    listGoalsUseCase: new ListGoalsUseCase(goalRepository, clock),
    logProgressUseCase: new LogProgressUseCase(goalRepository, logRepository, idGenerator, clock),
    getProgressDataUseCase: new GetProgressDataUseCase(goalRepository, clock),
    getHistoryUseCase: new GetHistoryUseCase(goalRepository, logRepository, clock),
    deleteLogUseCase: new DeleteLogUseCase(goalRepository, logRepository),
  };
}

export type Container = ReturnType<typeof buildContainer>;

let container: Container | null = null;

export function getContainer(): Container {
  if (!container) {
    container = buildContainer();
  }
  return container;
}
