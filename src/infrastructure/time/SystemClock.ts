import { Clock } from "@/application/ports/Clock";

/**
 * Concrete Clock backed by the system time. The only place "now" enters the
 * application, keeping use cases deterministic and testable.
 */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
