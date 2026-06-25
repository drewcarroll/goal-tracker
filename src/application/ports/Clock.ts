/**
 * Port for reading the current time. The application depends on this
 * abstraction so use cases stay deterministic and testable; infrastructure
 * provides a concrete implementation (the system clock).
 */
export interface Clock {
  now(): Date;
}
