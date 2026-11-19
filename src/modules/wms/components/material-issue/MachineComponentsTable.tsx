import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import type { MachineComponentRow } from "../../api";
import type { MachineComponentCol } from "../../hooks/material-issue/useMachineComponentsView";
import type { LocationParts } from "./removedComponents";
import { MachineComponentCell } from "./MachineComponentCell";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";

const T = S.componentsTabs;
const COL_LABEL: Record<MachineComponentCol, string> = {
  component: T.colComponent,
  variant: T.colVariant,
  serial: T.colSerial,
  rack: T.colRack,
  bin: T.colBin,
  note: T.colNote,
  date: T.colDate,
};

interface Props {
  rows: MachineComponentRow[];
  cols: MachineComponentCol[];
  /** Flat list (draft detail) instead of a bordered table. */
  flat: boolean;
  resolveLocation: (locationId: string | null) => LocationParts;
}

/** The components grid — a table, or a flat list inside an accordion body. */
export function MachineComponentsTable({ rows, cols, flat, resolveLocation }: Props) {
  if (flat) {
    // The accordion body is already a bordered region, so a second bordered
    // table would be a box-in-a-box. First column takes the width.
    return (
      <div className="divide-y divide-border">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-2">
            {cols.map((c, ci) => (
              <div key={c} className={ci === 0 ? "min-w-0 flex-1" : "shrink-0"}>
                <MachineComponentCell col={c} row={row} resolveLocation={resolveLocation} />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  // A genuinely wide 2-D table the reader pans (§8.7); the first column is
  // frozen so the row stays identifiable, dates right-align (§9).
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[560px] text-left">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {cols.map((c, idx) => (
              <th
                key={c}
                className={cn("px-4 py-2", idx === 0 && "sticky left-0 z-10 bg-muted", c === "date" && "text-right")}
              >
                <Typography variant="badge" tone="muted" asChild>
                  <span>{COL_LABEL[c]}</span>
                </Typography>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border align-top last:border-0">
              {cols.map((c, idx) => (
                <td
                  key={c}
                  className={cn(
                    "px-4 py-2",
                    idx === 0 && "sticky left-0 z-10 bg-card",
                    c === "date" && "text-right tabular-nums",
                  )}
                >
                  <MachineComponentCell col={c} row={row} resolveLocation={resolveLocation} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
