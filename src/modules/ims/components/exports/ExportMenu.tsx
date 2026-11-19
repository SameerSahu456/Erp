import { ChevronDown, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermission } from "@shared/rbac";

import { useRequestExport } from "../../hooks/exports/useRequestExport";
import { compactExportFilters } from "../../lib/export-jobs";
import { EXPORT_TYPE_LABEL } from "../../lib/export-labels";
import type { ExportFilters, ExportFormat, ExportType } from "../../lib/export-types";
import { imsCan } from "../../permissions";
import { EXPORTS_STRINGS as S } from "./exports.strings";

/** "Export ▾ Excel / CSV" — queues a background export of the page's current
 *  filters (spec E1, §7). Several export types group under their own label.
 *  Hidden without ims:export; the endpoint is the real gate. */
export function ExportMenu({
  exportTypes,
  filters,
}: {
  exportTypes: readonly ExportType[];
  filters: ExportFilters;
}) {
  const { can } = usePermission();
  const request = useRequestExport();
  if (!can(imsCan.export)) return null;

  const run = (exportType: ExportType, format: ExportFormat) =>
    request.mutate({ export_type: exportType, format, filters: compactExportFilters(filters) });
  const grouped = exportTypes.length > 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger disabled={request.isPending} render={<Button variant="outline" />}>
        {request.isPending ? (
          <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
        ) : (
          <Download className="mr-1.5 size-4" aria-hidden />
        )}
        {S.menu.trigger}
        <ChevronDown className="ml-1 size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {exportTypes.map((type) => (
          <DropdownMenuGroup key={type}>
            {grouped ? <DropdownMenuLabel>{EXPORT_TYPE_LABEL[type]}</DropdownMenuLabel> : null}
            <DropdownMenuItem onClick={() => run(type, "xlsx")}>{S.menu.excel}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run(type, "csv")}>{S.menu.csv}</DropdownMenuItem>
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
