import { Layers } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TablePagination } from "@/components/common/tables/TablePagination";
import { INWARDS_STRINGS } from "../inwards.strings";
import type { BatchDevicesView } from "../../../hooks/inwards/useBatchDevices";
import type { BatchDerivedView } from "./batch-view-helpers";
import { UnitSearchBox, NoSearchMatches } from "./UnitSearchBox";
import { ReceivedGroupSection } from "./ReceivedGroupSection";
import { CorrectionDialogs } from "./CorrectionDialogs";

/** Received Units (finalized batch) — grouped by part, search-filtered and
 *  paged, plus the shared identity-correction dialogs. */
export function ReceivedUnitsCard({
  view,
  derived,
}: {
  view: BatchDevicesView;
  derived: BatchDerivedView;
}) {
  const { unitSearch, onSearch, filteredLines } = view;
  const { receivedGroups, receivedPageSafe, receivedPageCount } = derived;
  return (
    <Card>
      <CardHeader>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            <Layers className="size-4 shrink-0 text-muted-foreground" />
            {INWARDS_STRINGS.batchDevices.receivedUnits}
          </CardTitle>
          <UnitSearchBox
            value={unitSearch}
            placeholder={INWARDS_STRINGS.batchDevices.searchReceivedPlaceholder}
            onSearch={onSearch}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {receivedGroups.length === 0 ? (
          <NoSearchMatches
            message={INWARDS_STRINGS.batchDevices.noUnitsMatch(unitSearch)}
            onClear={() => onSearch("")}
          />
        ) : null}
        {receivedGroups.map((group) => (
          <ReceivedGroupSection key={group.key} group={group} view={view} />
        ))}
        <CorrectionDialogs
          correction={view.correction}
          batchId={derived.batch.id}
          isPoSource={view.isPoSource}
          onClose={() => view.setCorrection(null)}
        />

        {/* Self-gating: hides itself when no page or size change would show anything new. */}
        <TablePagination
          page={receivedPageSafe}
          totalPages={receivedPageCount}
          pageSize={view.pageSize}
          total={filteredLines.length}
          onPageChange={view.setReceivedPage}
          onPageSizeChange={view.setPageSize}
          className="pt-1"
        />
      </CardContent>
    </Card>
  );
}
