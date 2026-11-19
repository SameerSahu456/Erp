// Canonical display labels + badge tones for warehouse team-assignment enums
// (role / level / capability). Coding-guideline §16.12: enum→label maps live in
// a shared `constants/` record, never hardcoded ("naked") inside a component.
//
// Both team surfaces read from here — the Team tab (`WarehouseTeamTab`) and
// the add/edit dialog (`AssignmentFormDialog`) — so a role/level/capability
// reads identically wherever it appears.

import type { AssignmentLevel, AssignmentRole } from "../api";

export const ASSIGNMENT_ROLE_LABELS: Record<AssignmentRole, string> = {
  warehouse_manager: "Warehouse Manager",
  store_manager: "Store Manager",
  mis: "MIS",
  engineer: "Engineer",
};

export const ASSIGNMENT_LEVEL_LABELS: Record<AssignmentLevel, string> = {
  l1: "L1",
  l2: "L2",
  l3: "L3",
};

/** Mirrors MAX_UNITS_PER_ISSUE on the backend, so the issue wizard cannot offer
 *  a selection the server would reject with a 422. */
export const MAX_UNITS_PER_ISSUE = 200;
