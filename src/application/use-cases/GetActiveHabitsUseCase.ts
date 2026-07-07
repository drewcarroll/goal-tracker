import { HabitRepository } from "@/domain/repositories/HabitRepository";
import { HabitDTO } from "../dtos/HabitDTO";
import { HabitMapper } from "../mappers/HabitMapper";

export interface GetActiveHabitsDTO {
  userId: string;
}

/**
 * Use Case: list a user's schedulable habits — active or already formed, but
 * not paused. Paused habits are excluded since they should not appear as
 * options when building tomorrow's plan.
 */
export class GetActiveHabitsUseCase {
  constructor(private readonly habitRepository: HabitRepository) {}

  async execute(dto: GetActiveHabitsDTO): Promise<HabitDTO[]> {
    const habits = await this.habitRepository.findByUserId(dto.userId);
    const schedulable = habits.filter((habit) => habit.state !== "paused");
    return HabitMapper.toDTOList(schedulable);
  }
}
