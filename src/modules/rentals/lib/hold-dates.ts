import { shiftDay } from "./dateRange";

type Day = string | null | undefined;

/** The first day a hold may start (`YYYY-MM-DD`), mirroring the API's rules:
 *  - AFTER each of `after` — the rental's start date and the last day already
 *    billed (`HOLD_NOT_AFTER_START`, `HOLD_IN_BILLED_PERIOD`);
 *  - ON or after each of `onOrAfter` — a unit's dispatch and its first
 *    unbilled day (`HOLD_BEFORE_DISPATCH`).
 *  Undefined when nothing bounds it. Dates compare as strings (ISO days). */
export function earliestHoldDay(after: Day[], onOrAfter: Day[] = []): string | undefined {
  const bounds = [
    ...after.filter((d): d is string => !!d).map((d) => shiftDay(d, 1)),
    ...onOrAfter.filter((d): d is string => !!d),
  ];
  return bounds.length ? bounds.reduce((a, b) => (a > b ? a : b)) : undefined;
}
