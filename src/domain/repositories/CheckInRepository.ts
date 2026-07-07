import { CheckIn } from "../entities/CheckIn";
import { LocalDate } from "../value-objects/LocalDate";

export interface CheckInRepository {
  findByUserIdAndDate(userId: string, date: LocalDate): Promise<CheckIn | null>;
  findByUserId(userId: string): Promise<CheckIn[]>;
  save(checkIn: CheckIn): Promise<void>;
  delete(id: string): Promise<void>;
}
