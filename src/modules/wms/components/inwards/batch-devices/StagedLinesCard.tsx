import { PackageCheck } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { TablePagination } from "@/components/common/tables/TablePagination";
import { INWARDS_STRINGS } from "../inwards.strings";
import type { BatchDevicesView } from "../../../hooks/inwards/useBatchDevices";
import type { BatchDerivedView } from "./batch-view-helpers";
import { UnitSearchBox, NoSearchMatches } from "./UnitSearchBox";

const S = INWARDS_STRINGS.batchDevices;

function StagedLinesTable({
  view,
  derived,
}: {
  view: BatchDevicesView;
  derived: BatchDerivedView;
}) {
  const { stagedLines, pagedStagedLines, stagedPageSafe, stagedPageCount } =
    derived;
  return (
    // Scroll stays inside — see §8.7 note on the sibling table
    // above. Same width-cap + min-w-0 combo.
    <div className="w-full max-w-full min-w-0 overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">{S.columnSrNo}</TableHead>
            <TableHead>{S.columnPartNo}</TableHead>
            <TableHead>{S.columnVariantName}</TableHead>
            <TableHead>{S.columnManufacturerSerialNo}</TableHead>
            <TableHead className="text-right">{S.columnQuantity}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagedStagedLines.map((r, i) => {
            const srNo = (stagedPageSafe - 1) * view.pageSize + i + 1;
            return (
              <TableRow key={srNo}>
                <TableCell>
                  <Typography variant="body" tone="muted" numeric>
                    {srNo}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body-strong">{r.partNumber}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body">{r.variantName}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="mono">
                    <TruncatedSerial value={r.serial} />
                  </Typography>
                </TableCell>
                <TableCell className="text-right">
                  <Typography variant="body">{r.qty}</Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {/* Self-gating: hides itself when no page or size change would show anything new. */}
      <TablePagination
        page={stagedPageSafe}
        totalPages={stagedPageCount}
        pageSize={view.pageSize}
        total={stagedLines.length}
        onPageChange={view.setStagedPage}
        onPageSizeChange={view.setPageSize}
        className="border-t"
      />

    </div>
  );
}

/** Ready to Receive / Line Items (draft or cancelled batch) — the staged lines
 *  from the batch metadata, search-filtered and paged. */
export function StagedLinesCard({
  view,
  derived,
}: {
  view: BatchDevicesView;
  derived: BatchDerivedView;
}) {
  const { unitSearch, onSearch } = view;
  return (
    <Card>
      <CardHeader>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            <PackageCheck className="size-4 shrink-0 text-muted-foreground" />
            {derived.isOpen ? S.readyToReceive : S.lineItems}
          </CardTitle>
          <UnitSearchBox
            value={unitSearch}
            placeholder={S.searchStagedPlaceholder}
            onSearch={onSearch}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {derived.stagedLines.length > 0 ? (
          <StagedLinesTable view={view} derived={derived} />
        ) : (
          <NoSearchMatches
            message={S.noLinesMatch(unitSearch)}
            onClear={() => onSearch("")}
          />
        )}
      </CardContent>
    </Card>
  );
}
