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
import { BackfillCheckInUseCase } from "@/application/use-cases/BackfillCheckInUseCase";
import { GetRankUseCase } from "@/application/use-cases/GetRankUseCase";
import { GetCheckInWindowUseCase } from "@/application/use-cases/GetCheckInWindowUseCase";
import { GetUserSettingsUseCase } from "@/application/use-cases/GetUserSettingsUseCase";
import { UpdateUserSettingsUseCase } from "@/application/use-cases/UpdateUserSettingsUseCase";
import { GetLockFormulaConfigUseCase } from "@/application/use-cases/GetLockFormulaConfigUseCase";
import { UpdateLockFormulaConfigUseCase } from "@/application/use-cases/UpdateLockFormulaConfigUseCase";
import { ResetLockFormulaConfigUseCase } from "@/application/use-cases/ResetLockFormulaConfigUseCase";
import { RecomputeAllGoalsUseCase } from "@/application/use-cases/RecomputeAllGoalsUseCase";
import { LocalDateService } from "@/application/services/LocalDateService";
import { CheckInWindowResolver } from "@/application/services/CheckInWindowResolver";
import { GoalCostRecomputeService } from "@/application/services/GoalCostRecomputeService";
import { getServerSupabaseClient } from "./database/supabaseClient";
import { SupabaseGoalRepository } from "./repositories/SupabaseGoalRepository";
import { SupabaseDailyPlanRepository } from "./repositories/SupabaseDailyPlanRepository";
import { SupabaseCheckInRepository } from "./repositories/SupabaseCheckInRepository";
import { SupabaseJournalRepository } from "./repositories/SupabaseJournalRepository";
import { SupabaseConfigRepository } from "./repositories/SupabaseConfigRepository";
import { SupabaseUserSettingsRepository } from "./repositories/SupabaseUserSettingsRepository";
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
  const configRepository = new SupabaseConfigRepository(supabase);
  const userSettingsRepository = new SupabaseUserSettingsRepository(supabase);
  const idGenerator = new UuidGenerator();
  const clock = new SystemClock();

  // Shared application services.
  const recomputeService = new GoalCostRecomputeService(
    goalRepository,
    checkInRepository,
    configRepository,
  );
  const checkInWindowResolver = new CheckInWindowResolver(userSettingsRepository, clock);

  // Application use cases.
  return {
    getGoalSuggestionsUseCase: new GetGoalSuggestionsUseCase(),
    createGoalUseCase: new CreateGoalUseCase(goalRepository, configRepository, idGenerator, clock),
    createGoalsFromOnboardingUseCase: new CreateGoalsFromOnboardingUseCase(
      goalRepository,
      configRepository,
      idGenerator,
      clock,
    ),
    getActiveGoalsUseCase: new GetActiveGoalsUseCase(goalRepository),
    getAllGoalsUseCase: new GetAllGoalsUseCase(goalRepository),
    updateGoalUseCase: new UpdateGoalUseCase(goalRepository),
    editGoalUseCase: new EditGoalUseCase(goalRepository, recomputeService),
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
      checkInWindowResolver,
      recomputeService,
      idGenerator,
      clock,
    ),
    backfillCheckInUseCase: new BackfillCheckInUseCase(
      goalRepository,
      checkInRepository,
      recomputeService,
      idGenerator,
      clock,
    ),
    getTodayCheckInUseCase: new GetTodayCheckInUseCase(checkInRepository),
    getGoalStatsUseCase: new GetGoalStatsUseCase(
      goalRepository,
      checkInRepository,
      configRepository,
    ),
    getCheckInHistoryUseCase: new GetCheckInHistoryUseCase(checkInRepository),
    editCheckInUseCase: new EditCheckInUseCase(goalRepository, checkInRepository, recomputeService),
    deleteCheckInUseCase: new DeleteCheckInUseCase(checkInRepository, recomputeService),
    getJournalHistoryUseCase: new GetJournalHistoryUseCase(journalRepository),
    createJournalEntryUseCase: new CreateJournalEntryUseCase(journalRepository, idGenerator, clock),
    getRankUseCase: new GetRankUseCase(checkInRepository),
    getCheckInWindowUseCase: new GetCheckInWindowUseCase(checkInWindowResolver),
    getUserSettingsUseCase: new GetUserSettingsUseCase(userSettingsRepository),
    updateUserSettingsUseCase: new UpdateUserSettingsUseCase(userSettingsRepository),
    getLockFormulaConfigUseCase: new GetLockFormulaConfigUseCase(configRepository),
    updateLockFormulaConfigUseCase: new UpdateLockFormulaConfigUseCase(configRepository),
    resetLockFormulaConfigUseCase: new ResetLockFormulaConfigUseCase(configRepository),
    recomputeAllGoalsUseCase: new RecomputeAllGoalsUseCase(goalRepository, recomputeService),
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
