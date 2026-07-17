import { CoinWalletRepository } from "@/domain/repositories/CoinWalletRepository";

export interface GetCoinBalanceDTO {
  userId: string;
}

/** Use Case: read a user's current coin balance. */
export class GetCoinBalanceUseCase {
  constructor(private readonly coinWalletRepository: CoinWalletRepository) {}

  async execute(dto: GetCoinBalanceDTO): Promise<number> {
    return this.coinWalletRepository.getBalance(dto.userId);
  }
}
