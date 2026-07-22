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
import { GetRankUseCase } from "@/application/use-cases/GetRankUseCase";
import { GetCheckInWindowUseCase } from "@/application/use-cases/GetCheckInWindowUseCase";
import { GetUserSettingsUseCase } from "@/application/use-cases/GetUserSettingsUseCase";
import { UpdateUserSettingsUseCase } from "@/application/use-cases/UpdateUserSettingsUseCase";
import { GetLockFormulaConfigUseCase } from "@/application/use-cases/GetLockFormulaConfigUseCase";
import { UpdateLockFormulaConfigUseCase } from "@/application/use-cases/UpdateLockFormulaConfigUseCase";
import { ResetLockFormulaConfigUseCase } from "@/application/use-cases/ResetLockFormulaConfigUseCase";
import { RecomputeAllGoalsUseCase } from "@/application/use-cases/RecomputeAllGoalsUseCase";
import { RegisterUsernameUseCase } from "@/application/use-cases/RegisterUsernameUseCase";
import { SendFriendRequestUseCase } from "@/application/use-cases/SendFriendRequestUseCase";
import { AcceptFriendRequestUseCase } from "@/application/use-cases/AcceptFriendRequestUseCase";
import { DeclineFriendRequestUseCase } from "@/application/use-cases/DeclineFriendRequestUseCase";
import { CancelFriendRequestUseCase } from "@/application/use-cases/CancelFriendRequestUseCase";
import { GetFriendsListUseCase } from "@/application/use-cases/GetFriendsListUseCase";
import { GetPendingFriendRequestsUseCase } from "@/application/use-cases/GetPendingFriendRequestsUseCase";
import { GetFriendPublicGoalsUseCase } from "@/application/use-cases/GetFriendPublicGoalsUseCase";
import { GetFriendCheckInLogUseCase } from "@/application/use-cases/GetFriendCheckInLogUseCase";
import { GetFriendGoalStatsUseCase } from "@/application/use-cases/GetFriendGoalStatsUseCase";
import { GetEconomyConfigUseCase } from "@/application/use-cases/GetEconomyConfigUseCase";
import { UpdateEconomyConfigUseCase } from "@/application/use-cases/UpdateEconomyConfigUseCase";
import { ResetEconomyConfigUseCase } from "@/application/use-cases/ResetEconomyConfigUseCase";
import { GetCoinBalanceUseCase } from "@/application/use-cases/GetCoinBalanceUseCase";
import { GetBattlePassCalendarUseCase } from "@/application/use-cases/GetBattlePassCalendarUseCase";
import { ClaimBattlePassDayUseCase } from "@/application/use-cases/ClaimBattlePassDayUseCase";
import { GetMaintenanceStatusUseCase } from "@/application/use-cases/GetMaintenanceStatusUseCase";
import { OpenMysteryBoxUseCase } from "@/application/use-cases/OpenMysteryBoxUseCase";
import { GetTrinketCollectionUseCase } from "@/application/use-cases/GetTrinketCollectionUseCase";
import { GetActivityFeedUseCase } from "@/application/use-cases/GetActivityFeedUseCase";
import { GetPinnedTrinketsUseCase } from "@/application/use-cases/GetPinnedTrinketsUseCase";
import { SetPinnedTrinketsUseCase } from "@/application/use-cases/SetPinnedTrinketsUseCase";
import { GetWeeklyScheduleStatusUseCase } from "@/application/use-cases/GetWeeklyScheduleStatusUseCase";
import { GoalPrivacyService } from "@/domain/services/GoalPrivacyService";
import { BattlePassCalendarService } from "@/domain/services/BattlePassCalendarService";
import { MysteryBoxRollService } from "@/domain/services/MysteryBoxRollService";
import { DeterministicRewardService } from "@/domain/services/DeterministicRewardService";
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
import { SupabaseUsernameRepository } from "./repositories/SupabaseUsernameRepository";
import { SupabaseFriendshipRepository } from "./repositories/SupabaseFriendshipRepository";
import { SupabaseEconomyConfigRepository } from "./repositories/SupabaseEconomyConfigRepository";
import { SupabaseCoinWalletRepository } from "./repositories/SupabaseCoinWalletRepository";
import { SupabaseBattlePassClaimRepository } from "./repositories/SupabaseBattlePassClaimRepository";
import { SupabaseTrinketInventoryRepository } from "./repositories/SupabaseTrinketInventoryRepository";
import { SupabaseActivityEventRepository } from "./repositories/SupabaseActivityEventRepository";
import { SupabaseShopPurchaseRepository } from "./repositories/SupabaseShopPurchaseRepository";
import { SupabasePinnedTrinketRepository } from "./repositories/SupabasePinnedTrinketRepository";
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
  const usernameRepository = new SupabaseUsernameRepository(supabase);
  const friendshipRepository = new SupabaseFriendshipRepository(supabase);
  const economyConfigRepository = new SupabaseEconomyConfigRepository(supabase);
  const coinWalletRepository = new SupabaseCoinWalletRepository(supabase);
  const battlePassClaimRepository = new SupabaseBattlePassClaimRepository(supabase);
  const trinketInventoryRepository = new SupabaseTrinketInventoryRepository(supabase);
  const activityEventRepository = new SupabaseActivityEventRepository(supabase);
  const shopPurchaseRepository = new SupabaseShopPurchaseRepository(supabase);
  const pinnedTrinketRepository = new SupabasePinnedTrinketRepository(supabase);
  const idGenerator = new UuidGenerator();
  const clock = new SystemClock();
  const goalPrivacyService = new GoalPrivacyService();
  const deterministicRewardService = new DeterministicRewardService();
  const battlePassCalendarService = new BattlePassCalendarService(deterministicRewardService);
  const mysteryBoxRollService = new MysteryBoxRollService(deterministicRewardService);

  // Shared application services.
  const recomputeService = new GoalCostRecomputeService(
    goalRepository,
    checkInRepository,
    configRepository,
    clock,
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
    registerUsernameUseCase: new RegisterUsernameUseCase(usernameRepository),
    sendFriendRequestUseCase: new SendFriendRequestUseCase(
      friendshipRepository,
      usernameRepository,
      idGenerator,
      clock,
    ),
    acceptFriendRequestUseCase: new AcceptFriendRequestUseCase(
      friendshipRepository,
      usernameRepository,
      clock,
    ),
    declineFriendRequestUseCase: new DeclineFriendRequestUseCase(friendshipRepository, clock),
    cancelFriendRequestUseCase: new CancelFriendRequestUseCase(friendshipRepository, clock),
    getFriendsListUseCase: new GetFriendsListUseCase(friendshipRepository, usernameRepository),
    getPendingFriendRequestsUseCase: new GetPendingFriendRequestsUseCase(
      friendshipRepository,
      usernameRepository,
    ),
    getFriendPublicGoalsUseCase: new GetFriendPublicGoalsUseCase(
      goalRepository,
      friendshipRepository,
      goalPrivacyService,
    ),
    getFriendCheckInLogUseCase: new GetFriendCheckInLogUseCase(
      goalRepository,
      checkInRepository,
      friendshipRepository,
      goalPrivacyService,
    ),
    getFriendGoalStatsUseCase: new GetFriendGoalStatsUseCase(
      goalRepository,
      checkInRepository,
      configRepository,
      friendshipRepository,
    ),
    getEconomyConfigUseCase: new GetEconomyConfigUseCase(economyConfigRepository),
    updateEconomyConfigUseCase: new UpdateEconomyConfigUseCase(economyConfigRepository),
    resetEconomyConfigUseCase: new ResetEconomyConfigUseCase(economyConfigRepository),
    getCoinBalanceUseCase: new GetCoinBalanceUseCase(coinWalletRepository),
    getBattlePassCalendarUseCase: new GetBattlePassCalendarUseCase(
      checkInRepository,
      battlePassClaimRepository,
      economyConfigRepository,
      battlePassCalendarService,
    ),
    claimBattlePassDayUseCase: new ClaimBattlePassDayUseCase(
      checkInRepository,
      battlePassClaimRepository,
      economyConfigRepository,
      coinWalletRepository,
      trinketInventoryRepository,
      activityEventRepository,
      battlePassCalendarService,
      clock,
    ),
    getMaintenanceStatusUseCase: new GetMaintenanceStatusUseCase(clock),
    openMysteryBoxUseCase: new OpenMysteryBoxUseCase(
      shopPurchaseRepository,
      economyConfigRepository,
      coinWalletRepository,
      trinketInventoryRepository,
      activityEventRepository,
      mysteryBoxRollService,
      idGenerator,
      clock,
    ),
    getTrinketCollectionUseCase: new GetTrinketCollectionUseCase(trinketInventoryRepository),
    getActivityFeedUseCase: new GetActivityFeedUseCase(
      friendshipRepository,
      usernameRepository,
      activityEventRepository,
    ),
    getPinnedTrinketsUseCase: new GetPinnedTrinketsUseCase(pinnedTrinketRepository),
    setPinnedTrinketsUseCase: new SetPinnedTrinketsUseCase(
      pinnedTrinketRepository,
      trinketInventoryRepository,
      economyConfigRepository,
    ),
    getWeeklyScheduleStatusUseCase: new GetWeeklyScheduleStatusUseCase(
      goalRepository,
      checkInRepository,
    ),
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
