import { CheckIn } from "@/domain/entities/CheckIn";
import { CheckInDTO } from "../dtos/CheckInDTO";

export class CheckInMapper {
  static toDTO(checkIn: CheckIn): CheckInDTO {
    return {
      id: checkIn.id,
      userId: checkIn.userId,
      date: checkIn.date.toString(),
      marks: checkIn.marks.map((mark) => ({ ...mark })),
      dayResult: checkIn.dayResult,
      createdAt: checkIn.createdAt.toISOString(),
    };
  }
}
