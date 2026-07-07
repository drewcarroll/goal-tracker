import { Habit } from "@/domain/entities/Habit";
import { findCatalogEntry } from "@/domain/value-objects/HabitCatalog";
import { HabitDTO } from "../dtos/HabitDTO";

/**
 * Maps domain entities <-> DTOs so that domain objects never leak out of the
 * application boundary. Denormalizes the catalog entry's display fields
 * (label/category/type/minMinutes) onto the DTO for UI convenience.
 */
export class HabitMapper {
  static toDTO(habit: Habit): HabitDTO {
    const catalogEntry = findCatalogEntry(habit.catalogId);
    if (!catalogEntry) {
      // Invariant: Habit.create/rehydrate already reject unknown catalog ids.
      throw new Error(`Habit "${habit.id}" references unknown catalog id "${habit.catalogId}".`);
    }
    return {
      id: habit.id,
      userId: habit.userId,
      catalogId: habit.catalogId,
      label: catalogEntry.label,
      category: catalogEntry.category,
      type: catalogEntry.type,
      minMinutes: catalogEntry.minMinutes,
      difficulty: habit.difficulty,
      currentLockCost: habit.currentLockCost,
      state: habit.state,
      createdAt: habit.createdAt.toISOString(),
    };
  }

  static toDTOList(habits: Habit[]): HabitDTO[] {
    return habits.map((habit) => HabitMapper.toDTO(habit));
  }
}
