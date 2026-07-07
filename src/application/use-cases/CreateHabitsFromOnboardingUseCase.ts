import { Habit } from "@/domain/entities/Habit";
import { HabitRepository } from "@/domain/repositories/HabitRepository";
import { CreateHabitsFromOnboardingDTO, HabitDTO } from "../dtos/HabitDTO";
import { HabitMapper } from "../mappers/HabitMapper";
import { IdGenerator } from "../ports/IdGenerator";
import { Clock } from "../ports/Clock";

/**
 * Use Case: bulk-create habits from onboarding's catalog + difficulty
 * selections. Each selection becomes its own habit at that difficulty's
 * starting lock cost.
 */
export class CreateHabitsFromOnboardingUseCase {
  constructor(
    private readonly habitRepository: HabitRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(dto: CreateHabitsFromOnboardingDTO): Promise<HabitDTO[]> {
    const now = this.clock.now();
    const habits = dto.selections.map((selection) =>
      Habit.create({
        id: this.idGenerator.generate(),
        userId: dto.userId,
        catalogId: selection.catalogId,
        difficulty: selection.difficulty,
        now,
      }),
    );

    for (const habit of habits) {
      await this.habitRepository.save(habit);
    }

    return HabitMapper.toDTOList(habits);
  }
}
