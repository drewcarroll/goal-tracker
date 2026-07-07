import { HabitRepository } from "@/domain/repositories/HabitRepository";
import { HabitNotFoundError } from "../errors/ApplicationError";
import { UpdateHabitDTO, HabitDTO } from "../dtos/HabitDTO";
import { HabitMapper } from "../mappers/HabitMapper";

/**
 * Use Case: pause or resume a habit. Ownership is enforced here: a caller can
 * only ever mutate their own habits.
 */
export class UpdateHabitUseCase {
  constructor(private readonly habitRepository: HabitRepository) {}

  async execute(dto: UpdateHabitDTO): Promise<HabitDTO> {
    const habit = await this.habitRepository.findById(dto.habitId);
    if (!habit || habit.userId !== dto.userId) {
      throw new HabitNotFoundError(dto.habitId);
    }

    if (dto.action === "pause") {
      habit.pause();
    } else {
      habit.resume();
    }

    await this.habitRepository.save(habit);

    return HabitMapper.toDTO(habit);
  }
}
