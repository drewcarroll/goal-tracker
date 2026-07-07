import { JournalRepository } from "@/domain/repositories/JournalRepository";
import { JournalEntryDTO } from "../dtos/JournalEntryDTO";
import { JournalEntryMapper } from "../mappers/JournalEntryMapper";

export interface GetJournalHistoryDTO {
  userId: string;
}

/** Use Case: list every past journal entry for a user, most recent first. */
export class GetJournalHistoryUseCase {
  constructor(private readonly journalRepository: JournalRepository) {}

  async execute(dto: GetJournalHistoryDTO): Promise<JournalEntryDTO[]> {
    const entries = await this.journalRepository.findByUserId(dto.userId);
    return entries.map((entry) => JournalEntryMapper.toDTO(entry));
  }
}
