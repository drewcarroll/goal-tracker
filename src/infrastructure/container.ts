import { CreateGoalUseCase } from "@/application/use-cases/CreateGoalUseCase";
import { UpdateGoalUseCase } from "@/application/use-cases/UpdateGoalUseCase";
import { DeleteGoalUseCase } from "@/application/use-cases/DeleteGoalUseCase";
import { ListGoalsUseCase } from "@/application/use-cases/ListGoalsUseCase";
import { LogProgressUseCase } from "@/application/use-cases/LogProgressUseCase";
import { GetProgressDataUseCase } from "@/application/use-cases/GetProgressDataUseCase";
import { getServerSupabaseClient } from "./database/supabaseClient";
import { SupabaseGoalRepository } from "./repositories/SupabaseGoalRepository";
import { SupabaseLogRepository } from "./repositories/SupabaseLogRepository";
import { NextAuthAuthService } from "./auth/NextAuthAuthService";
import { UuidGenerator } from "./id/UuidGenerator";
import { SystemClock } from "./time/SystemClock";

/**
 * Composition Root.
 *
 * This is the ONLY place where concrete infrastructure implementations
 * are wired to application use cases. Interfaces (route handlers, server
 * actions, pages) import pre-assembled use cases from here so they never
 * touch infrastructure or domain directly.
 */
function buildContainer() {
  const supabase = getServerSupabaseClient();

  // Infrastructure adapters (implementing domain/application ports).
  const goalRepository = new SupabaseGoalRepository(supabase);
  const logRepository = new SupabaseLogRepository(supabase);
  const idGenerator = new UuidGenerator();
  const clock = new SystemClock();

  // Cross-cutting services. The auth service reads the current request's
  // session lazily per call, so a single instance is safe to share here.
  const authService = new NextAuthAuthService();

  // Application use cases.
  return {
    authService,
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
