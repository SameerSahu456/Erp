import { ChevronDown, ChevronRight, FileText } from "lucide-react";

import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { RichTextView } from "@/components/ui/rich-text-editor";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { INWARDS_STRINGS } from "../inwards.strings";
import { descPreview } from "../batch-devices-helpers";
import type { BatchDevicesView } from "../../../hooks/inwards/useBatchDevices";
import type { ReceivedGroup } from "./batch-view-helpers";
import { ReceivedUnitRow } from "./ReceivedUnitRow";

const S = INWARDS_STRINGS.batchDevices;

function ReceivedUnitsTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>{S.columnInternalSerial}</TableHead>
        <TableHead>{S.columnMfrSerial}</TableHead>
        <TableHead>{S.columnVariant}</TableHead>
        <TableHead>{S.columnCondition}</TableHead>
        <TableHead>{S.columnStatus}</TableHead>
        <TableHead>{S.columnInspectionEngineer}</TableHead>
        <TableHead>{S.columnRepairEngineer}</TableHead>
        <TableHead>{S.columnQcEngineer}</TableHead>
        <TableHead className="w-10" />
      </TableRow>
    </TableHeader>
  );
}

/** One collapsible group of received units — a parent part, or a PO
 *  description line. */
export function ReceivedGroupSection({
  group,
  view,
}: {
  group: ReceivedGroup;
  view: BatchDevicesView;
}) {
  const isCollapsed = view.collapsedModels[group.key] ?? false;
  const partLines = group.lines;
  return (
    <Collapsible open={!isCollapsed}>
      <CollapsibleTrigger
        className="flex w-full items-center justify-between gap-3 rounded-md border bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-muted/60"
        onClick={() => view.toggleModel(group.key)}
      >
        <div className="flex min-w-0 items-center gap-2">
          {isCollapsed ? (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          )}
          {group.isDescription && (
            <FileText className="size-4 shrink-0 text-muted-foreground" />
          )}
          <Typography variant="body-strong" asChild>
            <TruncatedText
              value={group.isDescription ? descPreview(group.label) : group.label}
              className="min-w-0 max-w-full"
            />
          </Typography>
          {group.isDescription && (
            <StatusBadge variant="info">{S.descriptionBadge}</StatusBadge>
          )}
        </div>
        <StatusBadge variant="neutral">
          {S.unitsCount(partLines.length)}
        </StatusBadge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {group.isDescription && (
          // The PO line's rich-text description as a header above its units.
          <div className="border-x border-b bg-muted/20 px-4 py-3">
            <RichTextView html={group.label} lines={3} />
          </div>
        )}
        {/* Horizontal scroll STAYS INSIDE this div; the flex
            parent's `min-w-0` lets this shrink instead of pushing
            the whole card wider. §8.7 pattern — `w-full max-w-full`
            caps the scroller at container width, `min-w-0` on the
            flex parent stops the child's intrinsic content-width
            from bubbling up. */}
        <div className="w-full max-w-full min-w-0 overflow-x-auto rounded-b-md border border-t-0">
          <Table>
            <ReceivedUnitsTableHeader />
            <TableBody>
              {partLines.map((l) => (
                <ReceivedUnitRow key={l.id} l={l} view={view} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
