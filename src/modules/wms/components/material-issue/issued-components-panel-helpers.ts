import { type VariantListItem } from "@modules/ims";
import type { AvailableStockRow, MaterialIssueLineResponse } from "../../api";

// ── Picker helpers (shared with the Add / Pull-out dialogs) ──────────────────
export function readTracking(item: VariantListItem): boolean {
  return (item as { part_is_tracking?: boolean }).part_is_tracking ?? false;
}
export function unitLabel(u: AvailableStockRow): string {
  return u.manufacturer_serial
    ? `${u.internal_serial} · ${u.manufacturer_serial}`
    : u.internal_serial;
}

export interface FlatComponent {
  id: string;
  variantId: string;
  stockItemId: string | null;
}
export interface StagedAdd {
  key: string;
  variantId: string;
  label: string;
  serial: string;
}
/** Where a pulled part goes next: QC (`available`), repair or scrap. */
export type PullOutDestination = "available" | "repair" | "scrap";

export interface StagedRemove {
  key: string;
  sourceLineId: string;
  /** The recorded contents row it came out as, when it was recorded. */
  componentId: string | null;
  /** Null for a recorded part that already names its part. */
  variantId: string | null;
  destination: PullOutDestination;
  label: string;
  serial: string;
  locationId: string;
  rackName: string;
  binName: string | null;
  note: string;
}

// ── Machine tree walks ───────────────────────────────────────────────────────

function walkComponents(
  machine: MaterialIssueLineResponse,
  visit: (c: MaterialIssueLineResponse) => void,
) {
  const walk = (line: MaterialIssueLineResponse) => {
    for (const c of line.components ?? []) {
      visit(c);
      walk(c);
    }
  };
  walk(machine);
}

// The stock unit of one line of the build (the machine or a component).
export function findLineUnitId(
  machine: MaterialIssueLineResponse,
  lineId: string,
): string | null {
  if (machine.id === lineId) return machine.stock_item_id ?? null;
  let found: string | null = null;
  walkComponents(machine, (c) => {
    if (c.id === lineId) found = c.stock_item_id ?? null;
  });
  return found;
}

// Every component under the machine, flattened — the fitted list + the
// pull-out source options (any unit a part can be stripped out of).
export function flattenComponents(machine: MaterialIssueLineResponse): FlatComponent[] {
  const out: FlatComponent[] = [];
  walkComponents(machine, (c) =>
    out.push({
      id: c.id,
      variantId: c.part_variant_id,
      stockItemId: c.stock_item_id,
    }),
  );
  return out;
}

// Serials of every unit already fitted on this machine — used to reject
// adding the same serial twice.
export function collectFittedSerials(machine: MaterialIssueLineResponse): Set<string> {
  const set = new Set<string>();
  walkComponents(machine, (c) => {
    if (c.serial && FITTED_STATUSES.has(c.status)) set.add(c.serial);
  });
  return set;
}

/** A component still on the build. A returned / cancelled one has come off,
 *  so its unit may be added again — the same `pending` / `issued` set the
 *  backend's duplicate-serial check uses (`_LIVE_LINE_STATUSES`). */
const FITTED_STATUSES: ReadonlySet<string> = new Set(["pending", "issued"]);

export function buildPullOutSourceOptions(
  machine: MaterialIssueLineResponse,
  variantLabel: (variantId: string) => string,
  roles: { machine: string; component: string },
): { id: string; label: string }[] {
  const out = [
    {
      id: machine.id,
      label: `${roles.machine} · ${variantLabel(machine.part_variant_id)}`,
    },
  ];
  walkComponents(machine, (c) =>
    out.push({
      id: c.id,
      label: `${roles.component} · ${variantLabel(c.part_variant_id)}`,
    }),
  );
  return out;
}
