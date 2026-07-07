import { HabitRepository } from "@/domain/repositories/HabitRepository";
import { HabitDTO } from "../dtos/HabitDTO";
import { HabitMapper } from "../mappers/HabitMapper";

export interface GetAllHabitsDTO {
  userId: string;
}

/**
 * Use Case: list every one of a user's habits, including paused ones — for
 * Settings, where you need to see (and resume) paused habits too. Contrast
 * with GetActiveHabitsUseCase, which excludes paused habits since those
 * shouldn't appear as options when planning a day.
 */
export class GetAllHabitsUseCase {
  constructor(private readonly habitRepository: HabitRepository) {}

  async execute(dto: GetAllHabitsDTO): Promise<HabitDTO[]> {
    const habits = await this.habitRepository.findByUserId(dto.userId);
    return HabitMapper.toDTOList(habits);
  }
}
