import { Habit } from "../entities/Habit";

export interface HabitRepository {
  findById(id: string): Promise<Habit | null>;
  findByUserId(userId: string): Promise<Habit[]>;
  save(habit: Habit): Promise<void>;
}
