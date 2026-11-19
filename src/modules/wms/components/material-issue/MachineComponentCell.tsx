import { ClampedText } from "@/components/common/display/ClampedText";
import { EntityRef } from "@/components/common/display/EntityRef";
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial";
import { Typography } from "@/components/ui/typography";
import { formatIST } from "@shared/lib/date";

import type { MachineComponentRow } from "../../api";
import type { MachineComponentCol } from "../../hooks/material-issue/useMachineComponentsView";
import type { LocationParts } from "./removedComponents";

const DASH = "—";

interface Props {
  col: MachineComponentCol;
  row: MachineComponentRow;
  resolveLocation: (locationId: string | null) => LocationParts;
}

/** One cell of the machine-components table / flat list. */
export function MachineComponentCell({ col, row, resolveLocation }: Props) {
  if (col === "component") {
    return (
      <Typography variant="body-strong" truncate asChild>
        <span className="block min-w-0">{row.component || DASH}</span>
      </Typography>
    );
  }
  if (col === "variant") {
    return (
      <Typography variant="body" tone="muted" truncate asChild>
        <span className="block min-w-0">{row.variant_name || DASH}</span>
      </Typography>
    );
  }
  if (col === "serial") {
    // Serial links to the unit's device page; a draft line with no unit yet stays plain text.
    const serialNode = <TruncatedSerial value={row.serial} className="max-w-full" mono={false} />;
    return (
      <Typography variant="mono" tone="muted" asChild>
        {row.stock_item_id ? (
          <EntityRef kind="device" id={row.stock_item_id} value={row.serial}>
            {serialNode}
          </EntityRef>
        ) : (
          serialNode
        )}
      </Typography>
    );
  }
  if (col === "date") {
    return (
      <Typography variant="body" tone="muted" asChild>
        <span className="block min-w-0 whitespace-nowrap text-right">{row.date ? formatIST(row.date) : DASH}</span>
      </Typography>
    );
  }
  if (col === "note") {
    // Two lines at most so a long note can't stretch the row; the full text shows on hover.
    if (!row.note) {
      return (
        <Typography variant="body" tone="muted" asChild>
          <span className="block min-w-0">{DASH}</span>
        </Typography>
      );
    }
    return <ClampedText text={row.note} variant="body" className="min-w-48 max-w-xs" />;
  }
  // rack / bin — resolved from the warehouse tree the page already holds.
  const loc = resolveLocation(row.warehouse_location_id ?? null);
  return (
    <Typography variant="body" tone={col === "rack" ? "default" : "muted"} asChild>
      <span className="block min-w-0 truncate">{col === "rack" ? loc.rack : loc.bin}</span>
    </Typography>
  );
}
