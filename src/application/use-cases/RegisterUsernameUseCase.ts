import { Username } from "@/domain/value-objects/Username";
import { UsernameRepository } from "@/domain/repositories/UsernameRepository";

export interface RegisterUsernameDTO {
  userId: string;
  username: string;
}

/**
 * Use Case: record that a username has logged in, so it can later be found
 * by a friend request and displayed back from a userId. Called once per
 * login (see app/api/login/route.ts) — idempotent (the repository upserts
 * keyed by userId, and the same username always derives the same userId, so
 * there is nothing to conflict).
 */
export class RegisterUsernameUseCase {
  constructor(private readonly usernameRepository: UsernameRepository) {}

  async execute(dto: RegisterUsernameDTO): Promise<void> {
    const username = Username.create(dto.username);
    await this.usernameRepository.register(dto.userId, username);
  }
}
