import type { SalesOrderItemWire } from "../../../api";

/** A line whose PM decision is in (Approved or Rejected). */
export function isDecidedLine(
  line: Pick<SalesOrderItemWire, "line_status">,
): boolean {
  return line.line_status === "Approved" || line.line_status === "Rejected";
}
