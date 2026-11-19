import type { MaterialIssueResponse } from "../../api";
import type { DemandLine, IssueRow } from "./material-issue-form-helpers";
import { buildRowFromExisting } from "./material-issue-payload-helpers";

interface HeaderFields {
  engineerId: string;
  externalTicket: string;
  notes: string;
}

/** Header differs from its baseline (ticket / notes compared trimmed). */
export function headerDiffers(baseline: HeaderFields, current: HeaderFields): boolean {
  return (
    current.engineerId !== baseline.engineerId ||
    current.externalTicket.trim() !== baseline.externalTicket.trim() ||
    current.notes.trim() !== baseline.notes.trim()
  );
}

/** Edit mode: the draft's primary lines as editable rows + the originals' ids. */
export function seedEditRows(
  draft: MaterialIssueResponse,
  demandLines: DemandLine[],
  variantLabel: (variantId: string) => string,
): { seeded: IssueRow[]; originalIds: string[] } {
  const primary = (draft.line_items ?? []).filter((l) => l.role === "primary");
  const seeded = primary.map((l) => buildRowFromExisting(l, demandLines, variantLabel));
  return { seeded, originalIds: primary.map((l) => l.id) };
}

/** Guard-worthy edits: a picked source on create, or any line / header change. */
export function formHasEdits(input: {
  isEdit: boolean;
  sourceEntityId: string;
  linesChanged: boolean;
  headerChanged: boolean;
}): boolean {
  return (
    (!input.isEdit && input.sourceEntityId !== "") ||
    input.linesChanged ||
    input.headerChanged
  );
}
