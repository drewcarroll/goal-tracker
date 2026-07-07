import { DailyPlan } from "../entities/DailyPlan";
import { LocalDate } from "../value-objects/LocalDate";

export interface DailyPlanRepository {
  findByUserIdAndDate(userId: string, date: LocalDate): Promise<DailyPlan | null>;
  save(plan: DailyPlan): Promise<void>;
}
