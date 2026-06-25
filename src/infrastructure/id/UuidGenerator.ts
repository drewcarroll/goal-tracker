import { randomUUID } from "node:crypto";
import { IdGenerator } from "@/application/ports/IdGenerator";

/**
 * Concrete implementation of the IdGenerator port using Node's crypto.
 */
export class UuidGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
