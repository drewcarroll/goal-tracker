import { CreateGoalUseCase } from "@/application/use-cases/CreateGoalUseCase";
import { UpdateGoalUseCase } from "@/application/use-cases/UpdateGoalUseCase";
import { DeleteGoalUseCase } from "@/application/use-cases/DeleteGoalUseCase";
import { ListGoalsUseCase } from "@/application/use-cases/ListGoalsUseCase";
import { LogProgressUseCase } from "@/application/use-cases/LogProgressUseCase";
import { GetProgressDataUseCase } from "@/application/use-cases/GetProgressDataUseCase";
import { getServerSupabaseClient } from "./database/supabaseClient";
import { SupabaseGoalRepository } from "./repositories/SupabaseGoalRepository";
import { SupabaseLogRepository } from "./repositories/SupabaseLogRepository";
import { UuidGenerator } from "./id/UuidGenerator";
import { SystemClock } from "./time/SystemClock";
import { OWNER_ID } from "./config/owner";
import { env } from "./config/env";

/**
 * Composition Root.
 *
 * This is the ONLY place where concrete infrastructure implementations
 * are wired to application use cases. Interfaces (route handlers, server
 * actions, pages) import pre-assembled use cases from here so they never
 * touch infrastructure or domain directly.
 *
 * This is a single-user app: there is no auth service. `ownerId` is the fixed
 * identity every goal/log is scoped to, and `appPassword` backs the shared
 * password gate (see middleware + /api/unlock).
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
    ownerId: OWNER_ID,
    appPassword: env.appPassword(),
    createGoalUseCase: new CreateGoalUseCase(goalRepository, idGenerator, clock),
    updateGoalUseCase: new UpdateGoalUseCase(goalRepository, clock),
    deleteGoalUseCase: new DeleteGoalUseCase(goalRepository),
    listGoalsUseCase: new ListGoalsUseCase(goalRepository, clock),
    logProgressUseCase: new LogProgressUseCase(goalRepository, logRepository, idGenerator, clock),
    getProgressDataUseCase: new GetProgressDataUseCase(goalRepository, clock),
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
