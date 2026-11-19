import type { MaterialIssueLineResponse, MaterialIssuePullOutUnit } from "../../api";

// Rack / bin / combined-location names for a pulled-out unit's destination.
export interface LocationParts {
  location: string;
  rack: string;
  bin: string;
}

// Pull-outs harvested from THIS machine's units — its own unit or any fitted
// component. A pull-out records the source unit it came from (D26), so we match
// on that back-reference (the components tree itself is left intact).
export function pullOutsForMachine(
  machine: MaterialIssueLineResponse,
  pullOuts: MaterialIssuePullOutUnit[],
): MaterialIssuePullOutUnit[] {
  const ids = new Set<string>();
  const walk = (line: MaterialIssueLineResponse) => {
    if (line.stock_item_id) ids.add(line.stock_item_id);
    for (const c of line.components ?? []) walk(c);
  };
  walk(machine);
  return pullOuts.filter((u) => ids.has(u.pulled_from_stock_item_id));
}

// Units of THIS machine (its own unit or any component) that were returned to
// stock — the returned line stays in the tree carrying its note/location/date.
export function returnedUnitsForMachine(
  machine: MaterialIssueLineResponse,
): MaterialIssueLineResponse[] {
  const out: MaterialIssueLineResponse[] = [];
  const walk = (line: MaterialIssueLineResponse) => {
    if (line.stage === "returned") out.push(line);
    for (const c of line.components ?? []) walk(c);
  };
  walk(machine);
  return out;
}
