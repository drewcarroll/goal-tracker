import { GoalStatsService } from "@/domain/services/GoalStatsService";
import { CreateGoalUseCase } from "@/application/use-cases/CreateGoalUseCase";
import { ListGoalsUseCase } from "@/application/use-cases/ListGoalsUseCase";
import { UpdateGoalProgressUseCase } from "@/application/use-cases/UpdateGoalProgressUseCase";
import { GetGoalStatsUseCase } from "@/application/use-cases/GetGoalStatsUseCase";
import { getServerSupabaseClient } from "./database/supabaseClient";
import { SupabaseGoalRepository } from "./repositories/SupabaseGoalRepository";
import { SupabaseAuthService } from "./auth/SupabaseAuthService";
import { UuidGenerator } from "./id/UuidGenerator";

/**
 * Composition Root.
 *
 * This is the ONLY place where concrete infrastructure implementations
 * are wired to application use cases. Interfaces (route handlers) import
 * pre-assembled use cases from here so they never touch infrastructure
 * or domain directly.
 */
function buildContainer() {
  const supabase = getServerSupabaseClient();

  // Infrastructure adapters (implementing domain/application ports).
  const goalRepository = new SupabaseGoalRepository(supabase);
  const idGenerator = new UuidGenerator();

  // Domain services.
  const goalStatsService = new GoalStatsService();

  // Cross-cutting services. The auth service binds to the current request's
  // cookies lazily per call, so a single instance is safe to share here.
  const authService = new SupabaseAuthService();

  // Application use cases.
  return {
    authService,
    createGoalUseCase: new CreateGoalUseCase(goalRepository, idGenerator),
    listGoalsUseCase: new ListGoalsUseCase(goalRepository),
    updateGoalProgressUseCase: new UpdateGoalProgressUseCase(goalRepository),
    getGoalStatsUseCase: new GetGoalStatsUseCase(goalRepository, goalStatsService),
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
