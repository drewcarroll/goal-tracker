import type { CheckInDTO } from "@/application/dtos/CheckInDTO";

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;

/** "2026-01-15" -> epoch ms at UTC midnight, for pure date-only arithmetic. */
function toUtcMs(date: string): number {
  return new Date(`${date}T00:00:00Z`).getTime();
}

function addDays(date: string, days: number): string {
  const shifted = new Date(toUtcMs(date) + days * DAY_MS);
  return shifted.toISOString().slice(0, 10);
}

/**
 * Last 30 user-local days, colored by that day's check-in result. Grey means
 * no check-in that day — per the non-negotiable "unplanned days are neutral"
 * rule, this is deliberately NOT rendered as a miss.
 */
export function DayResultCalendar({ today, checkIns }: { today: string; checkIns: CheckInDTO[] }) {
  const byDate = new Map(checkIns.map((c) => [c.date, c.dayResult]));
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(today, -(WINDOW_DAYS - 1 - i)));

  return (
    <div className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 className="font-semibold text-gray-900">Last 30 days</h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <Legend color="bg-emerald-500" label="Pass" />
          <Legend color="bg-red-400" label="Fail" />
          <Legend color="bg-gray-100" label="No plan" />
        </div>
      </div>
      <div className="grid grid-cols-10 gap-1.5 xs:grid-cols-10">
        {days.map((date) => {
          const result = byDate.get(date);
          const isToday = date === today;
          return (
            <div
              key={date}
              title={`${date}${result ? ` · ${result}` : ""}`}
              className={`aspect-square rounded-md ${
                result === "PASS"
                  ? "bg-emerald-500"
                  : result === "FAIL"
                    ? "bg-red-400"
                    : "bg-gray-100"
              } ${isToday ? "ring-2 ring-brand ring-offset-1" : ""}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2.5 w-2.5 rounded-sm ${color}`} />
      {label}
    </span>
  );
}
