import type { MaterialIssueLineResponse } from "../../api";
import type { ReturnUnit } from "./returnWorkspaceContext";

const DASH = "—";
const SHORT_ID_CHARS = 8;

// A machine's title/serial come denormalized on the line.
export function unitTitle(line: MaterialIssueLineResponse): string {
  return line.part_variant_sku || line.part_variant_name || line.part_variant_id.slice(0, SHORT_ID_CHARS);
}

export function unitSerial(line: MaterialIssueLineResponse): string {
  return line.serial || (line.stock_item_id ? line.stock_item_id.slice(0, SHORT_ID_CHARS) : DASH);
}

export function toReturnUnit(line: MaterialIssueLineResponse, machineLineId: string): ReturnUnit {
  return { lineId: line.id, title: unitTitle(line), serial: unitSerial(line), machineLineId };
}

// Live `issued` components under a machine; they cascade with it (D24) but are returnable alone too.
export function issuedComponents(machine: MaterialIssueLineResponse): ReturnUnit[] {
  const out: ReturnUnit[] = [];
  const walk = (line: MaterialIssueLineResponse) => {
    for (const c of line.components ?? []) {
      if (c.status === "issued" && c.stock_item_id) out.push(toReturnUnit(c, machine.id));
      walk(c);
    }
  };
  walk(machine);
  return out;
}
