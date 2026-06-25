/**
 * Port for generating unique identifiers. The application depends on
 * this abstraction; infrastructure provides a concrete implementation
 * (e.g. UUID v4). Keeps the application free of library specifics.
 */
export interface IdGenerator {
  generate(): string;
}
