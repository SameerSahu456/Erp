import type { DeviceAssignableUser } from "../../api";

/** Sentinel option value — not a user id, so it can never collide with one. */
export const WITHDRAW_VALUE = "__withdraw__";

// The device-row denorm returns "Inspect" while the assignable-users pool returns
// "Inspect None"; strip a trailing none/null/undefined so every surface matches.
export const cleanName = (n: string | null | undefined): string =>
  (n ?? "").replace(/\s+(none|null|undefined)$/i, "").trim();

// Only ENGINEERS are assignable here (the backend pool also returns capable
// managers); level-scoped slots (e.g. L1/L2 inspection) also narrow by level.
export const engineerSlotPool = (
  pool: DeviceAssignableUser[],
  levels: string[] | null,
): DeviceAssignableUser[] =>
  pool.filter(
    (u) => u.role === "engineer" && (!levels || levels.includes(u.level ?? "")),
  );
