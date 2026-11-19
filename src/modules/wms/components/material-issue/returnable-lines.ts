import type { MaterialIssueLineResponse } from "../../api";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";

// Max length of a return note / reason — enforced on the FE (textarea maxLength
// + counter) and the BE (MaterialIssueReturnEntry.note / ...Request.reason
// max_length). Keep the two in sync.
export const MI_NOTE_MAX_LENGTH = 500;

// A returnable line, flattened from the line tree with a human label for its
// owning line (variant id short + role). Live `issued` component lines nest
// under their primary — returning the primary cascades to them (backend rule
// D24), so each nested component needs its OWN return location too.
//
// `kind` distinguishes a top-level PRIMARY entry (whose `components` are the
// forced cascade) from a top-level STANDALONE entry — a component listed
// again on its own so it can be pulled out and returned individually,
// without touching the primary it's still fitted into (e.g. one bad RAM
// stick out of a machine that's staying with the engineer).
export interface ReturnableLine {
  lineId: string;
  stockItemId: string;
  lineLabel: string;
  kind: "primary" | "component";
  components: ReturnableLine[];
}

// Build the returnable line list (a line IS a physical unit). Two kinds of
// top-level, independently selectable entries:
//  - `primary` — a live `issued` primary with an allocated stock item; its
//    live `issued` components nest underneath so the return dialog can
//    cascade the primary's return onto them (backend rule D24).
//  - `component` — every live `issued` component listed AGAIN at the top
//    level (regardless of nesting depth) so it can be pulled out and
//    returned on its own, without touching the primary it's still fitted
//    into (e.g. one bad RAM stick out of a machine that stays issued).
// Shared by the detail page (whole-MI return) and the line-first listing
// (scoped to the one clicked unit) — one source of truth for the tree.
export function collectReturnableLines(
  lines: MaterialIssueLineResponse[],
): ReturnableLine[] {
  const label = (line: MaterialIssueLineResponse) => {
    const roleLabel =
      line.role === "component"
        ? S.detail.line.component
        : S.detail.line.primary;
    return `${roleLabel} · ${line.part_variant_id.slice(0, 8)}`;
  };
  const collectComponents = (
    line: MaterialIssueLineResponse,
  ): ReturnableLine[] =>
    (line.components ?? [])
      .filter((c) => c.status === "issued" && c.stock_item_id)
      .map((c) => ({
        lineId: c.id,
        stockItemId: c.stock_item_id as string,
        lineLabel: label(c),
        kind: "component" as const,
        components: collectComponents(c),
      }));

  const primaries: ReturnableLine[] = lines
    .filter((l) => l.role === "primary" && l.status === "issued" && l.stock_item_id)
    .map((l) => ({
      lineId: l.id,
      stockItemId: l.stock_item_id as string,
      lineLabel: label(l),
      kind: "primary" as const,
      components: collectComponents(l),
    }));

  const standaloneComponents: ReturnableLine[] = [];
  const walkStandalone = (line: MaterialIssueLineResponse) => {
    for (const c of line.components ?? []) {
      if (c.status === "issued" && c.stock_item_id) {
        standaloneComponents.push({
          lineId: c.id,
          stockItemId: c.stock_item_id as string,
          lineLabel: label(c),
          kind: "component",
          components: collectComponents(c),
        });
      }
      walkStandalone(c);
    }
  };
  lines.forEach(walkStandalone);

  return [...primaries, ...standaloneComponents];
}
