import { PinnedTrinketRepository } from "@/domain/repositories/PinnedTrinketRepository";

export interface GetPinnedTrinketsDTO {
  userId: string;
}

/** Use Case: the ordered ids of trinkets a user has chosen to showcase. */
export class GetPinnedTrinketsUseCase {
  constructor(private readonly pinnedTrinketRepository: PinnedTrinketRepository) {}

  async execute(dto: GetPinnedTrinketsDTO): Promise<readonly string[]> {
    return this.pinnedTrinketRepository.getPinned(dto.userId);
  }
}
