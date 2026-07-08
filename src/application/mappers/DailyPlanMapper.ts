import { DailyPlan } from "@/domain/entities/DailyPlan";
import { DailyPlanDTO } from "../dtos/DailyPlanDTO";

export class DailyPlanMapper {
  static toDTO(plan: DailyPlan): DailyPlanDTO {
    return {
      id: plan.id,
      userId: plan.userId,
      date: plan.date.toString(),
      goalIds: [...plan.goalIds],
      locksSpent: plan.locksSpent,
      createdAt: plan.createdAt.toISOString(),
    };
  }
}
