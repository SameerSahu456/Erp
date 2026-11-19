import { ASSIGNMENT_CAPABILITIES } from "../schemas/assignment.schema";

type AssignmentCapabilityValue = (typeof ASSIGNMENT_CAPABILITIES)[number];

/** Derive the stored `capabilities` array from the appointment form's level
 *  (dynamic assignment, 2026-09). Managers/MIS carry none. L1/L2 →
 *  ['inspection']; L3 → ['repair','qc','outward_qc']. Under dynamic assignment
 *  NONE of these is consulted for stage access any more — inspection/repair/qc
 *  gate per-device on the assignment, and outward_qc gates on any live
 *  assignment at the warehouse (not the capability) — so the values are just
 *  placeholders that satisfy the backend CHECK constraints. L3 carries
 *  outward_qc unconditionally because every L3 can run it. */
export function deriveAssignmentCapabilities(
  role: string,
  level: string | null | undefined,
): AssignmentCapabilityValue[] | null {
  if (role !== "engineer" || !level) return null;
  if (level === "l1" || level === "l2") return ["inspection"];
  return ["repair", "qc", "outward_qc"];
}
