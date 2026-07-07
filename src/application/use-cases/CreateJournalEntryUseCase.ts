import { JournalEntry } from "@/domain/entities/JournalEntry";
import { LocalDate } from "@/domain/value-objects/LocalDate";
import { JournalRepository } from "@/domain/repositories/JournalRepository";
import { CreateJournalEntryDTO, JournalEntryDTO } from "../dtos/JournalEntryDTO";
import { JournalEntryMapper } from "../mappers/JournalEntryMapper";
import { IdGenerator } from "../ports/IdGenerator";
import { Clock } from "../ports/Clock";

/**
 * Use Case: create (or overwrite) the day's private journal entry. Entirely
 * optional fields — this never feeds stats or lock-cost math.
 */
export class CreateJournalEntryUseCase {
  constructor(
    private readonly journalRepository: JournalRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(dto: CreateJournalEntryDTO): Promise<JournalEntryDTO> {
    const entry = JournalEntry.create({
      id: this.idGenerator.generate(),
      userId: dto.userId,
      date: LocalDate.create(dto.date),
      text: dto.text,
      mood: dto.mood,
      photoUrl: dto.photoUrl,
      now: this.clock.now(),
    });

    await this.journalRepository.save(entry);

    return JournalEntryMapper.toDTO(entry);
  }
}
