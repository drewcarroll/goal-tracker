import { GetGoalSuggestionsUseCase } from "@/application/use-cases/GetGoalSuggestionsUseCase";
import { CreateGoalUseCase } from "@/application/use-cases/CreateGoalUseCase";
import { CreateGoalsFromOnboardingUseCase } from "@/application/use-cases/CreateGoalsFromOnboardingUseCase";
import { GetActiveGoalsUseCase } from "@/application/use-cases/GetActiveGoalsUseCase";
import { GetAllGoalsUseCase } from "@/application/use-cases/GetAllGoalsUseCase";
import { UpdateGoalUseCase } from "@/application/use-cases/UpdateGoalUseCase";
import { EditGoalUseCase } from "@/application/use-cases/EditGoalUseCase";
import { DeleteGoalUseCase } from "@/application/use-cases/DeleteGoalUseCase";
import { CreateDailyPlanUseCase } from "@/application/use-cases/CreateDailyPlanUseCase";
import { GetTodayPlanUseCase } from "@/application/use-cases/GetTodayPlanUseCase";
import { SubmitCheckInUseCase } from "@/application/use-cases/SubmitCheckInUseCase";
import { GetTodayCheckInUseCase } from "@/application/use-cases/GetTodayCheckInUseCase";
import { GetGoalStatsUseCase } from "@/application/use-cases/GetGoalStatsUseCase";
import { GetCheckInHistoryUseCase } from "@/application/use-cases/GetCheckInHistoryUseCase";
import { EditCheckInUseCase } from "@/application/use-cases/EditCheckInUseCase";
import { DeleteCheckInUseCase } from "@/application/use-cases/DeleteCheckInUseCase";
import { GetJournalHistoryUseCase } from "@/application/use-cases/GetJournalHistoryUseCase";
import { CreateJournalEntryUseCase } from "@/application/use-cases/CreateJournalEntryUseCase";
import { LocalDateService } from "@/application/services/LocalDateService";
import { getServerSupabaseClient } from "./database/supabaseClient";
import { SupabaseGoalRepository } from "./repositories/SupabaseGoalRepository";
import { SupabaseDailyPlanRepository } from "./repositories/SupabaseDailyPlanRepository";
import { SupabaseCheckInRepository } from "./repositories/SupabaseCheckInRepository";
import { SupabaseJournalRepository } from "./repositories/SupabaseJournalRepository";
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
 * There is no auth service. The id every goal/plan/check-in/journal entry is
 * scoped to is derived per request from the signed-in username (see
 * interfaces/web/http/currentUser.ts) and passed into the use cases as `userId`.
 */
function buildContainer() {
  const supabase = getServerSupabaseClient();

  // Infrastructure adapters (implementing domain/application ports).
  const goalRepository = new SupabaseGoalRepository(supabase);
  const dailyPlanRepository = new SupabaseDailyPlanRepository(supabase);
  const checkInRepository = new SupabaseCheckInRepository(supabase);
  const journalRepository = new SupabaseJournalRepository(supabase);
  const idGenerator = new UuidGenerator();
  const clock = new SystemClock();

  // Application use cases.
  return {
    getGoalSuggestionsUseCase: new GetGoalSuggestionsUseCase(),
    createGoalUseCase: new CreateGoalUseCase(goalRepository, idGenerator, clock),
    createGoalsFromOnboardingUseCase: new CreateGoalsFromOnboardingUseCase(
      goalRepository,
      idGenerator,
      clock,
    ),
    getActiveGoalsUseCase: new GetActiveGoalsUseCase(goalRepository),
    getAllGoalsUseCase: new GetAllGoalsUseCase(goalRepository),
    updateGoalUseCase: new UpdateGoalUseCase(goalRepository),
    editGoalUseCase: new EditGoalUseCase(goalRepository),
    deleteGoalUseCase: new DeleteGoalUseCase(goalRepository),
    createDailyPlanUseCase: new CreateDailyPlanUseCase(
      goalRepository,
      dailyPlanRepository,
      idGenerator,
      clock,
    ),
    getTodayPlanUseCase: new GetTodayPlanUseCase(dailyPlanRepository),
    submitCheckInUseCase: new SubmitCheckInUseCase(
      goalRepository,
      checkInRepository,
      idGenerator,
      clock,
    ),
    getTodayCheckInUseCase: new GetTodayCheckInUseCase(checkInRepository),
    getGoalStatsUseCase: new GetGoalStatsUseCase(goalRepository, checkInRepository),
    getCheckInHistoryUseCase: new GetCheckInHistoryUseCase(checkInRepository),
    editCheckInUseCase: new EditCheckInUseCase(goalRepository, checkInRepository),
    deleteCheckInUseCase: new DeleteCheckInUseCase(goalRepository, checkInRepository),
    getJournalHistoryUseCase: new GetJournalHistoryUseCase(journalRepository),
    createJournalEntryUseCase: new CreateJournalEntryUseCase(journalRepository, idGenerator, clock),
    localDateService: new LocalDateService(clock),
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
