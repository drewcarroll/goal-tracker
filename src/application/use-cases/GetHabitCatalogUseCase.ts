import { HABIT_CATALOG } from "@/domain/value-objects/HabitCatalog";
import { HabitCatalogEntryDTO } from "../dtos/HabitDTO";

/**
 * Use Case: expose the hardcoded habit catalog to the UI. No repository
 * dependency — the catalog is a domain constant, not persisted — but still
 * goes through a use case so interfaces never imports domain directly.
 */
export class GetHabitCatalogUseCase {
  execute(): HabitCatalogEntryDTO[] {
    return HABIT_CATALOG.map((entry) => ({
      id: entry.id,
      label: entry.label,
      category: entry.category,
      type: entry.type,
      minMinutes: entry.minMinutes,
    }));
  }
}
