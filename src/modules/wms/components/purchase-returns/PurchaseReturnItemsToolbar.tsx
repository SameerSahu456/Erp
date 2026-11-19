import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/common/forms/FieldError";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import { TableSearchInput } from "@/components/common/tables/TableSearchInput";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { PurchaseReturnDisposition } from "../../api";
import { PURCHASE_RETURN_DETAIL_STRINGS as S } from "./purchase-returns.strings";
import {
  DISPOSITION_FILTER_LABELS,
  DISPOSITION_OPTIONS,
} from "./purchase-return-items-helpers";

const DISPOSITION_ERROR_ID = "pr-bulk-disposition-error";

interface BulkBarProps {
  bulkDisposition: PurchaseReturnDisposition | "";
  onBulkDispositionChange: (value: PurchaseReturnDisposition | "") => void;
  selectedUndecidedCount: number;
  isRaised: boolean;
  applyBlockReason: string | null;
  rejectBlockReason: string | null;
  onApplyClick: () => void;
  onRejectClick: () => void;
}

/** Procurement's bulk disposition / bulk reject bar above the items table. */
export function PurchaseReturnItemsBulkBar({
  bulkDisposition,
  onBulkDispositionChange,
  selectedUndecidedCount,
  isRaised,
  applyBlockReason,
  rejectBlockReason,
  onApplyClick,
  onRejectClick,
}: BulkBarProps) {
  // Apply with no disposition flags the field instead of running.
  const [showRequired, setShowRequired] = useState(false);
  const missing = showRequired && bulkDisposition === "";
  const apply = () => {
    setShowRequired(bulkDisposition === "");
    if (bulkDisposition !== "") onApplyClick();
  };
  return (
    <div className="mb-4 flex flex-wrap items-start gap-3">
      <div>
        <Select
          value={bulkDisposition}
          // The × clears to null; keep it "" so "nothing picked" has one value.
          onValueChange={(value) =>
            onBulkDispositionChange((value ?? "") as PurchaseReturnDisposition | "")
          }
        >
          <SelectTrigger
            className="h-9 w-48"
            aria-invalid={missing}
            aria-describedby={missing ? DISPOSITION_ERROR_ID : undefined}
          >
            {/* Show the disposition label, not its raw value (PAGE-UI §7.2). */}
            <SelectValue placeholder={S.units.disposition}>
              {DISPOSITION_OPTIONS.find((o) => o.value === bulkDisposition)?.label ??
                S.units.disposition}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DISPOSITION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError
          id={DISPOSITION_ERROR_ID}
          message={missing ? S.units.pickDisposition : null}
        />
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button
              variant="outline"
              className="h-9"
              disabled={selectedUndecidedCount === 0}
              onClick={apply}
            >
              {S.units.applyToSelected(selectedUndecidedCount)}
            </Button>
          </TooltipTrigger>
          {applyBlockReason && (
            <TooltipContent>{applyBlockReason}</TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      {isRaised && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button
                variant="destructive"
                className="h-9"
                disabled={selectedUndecidedCount === 0}
                onClick={onRejectClick}
              >
                {S.units.rejectSelected}
              </Button>
            </TooltipTrigger>
            {rejectBlockReason && (
              <TooltipContent>{rejectBlockReason}</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

interface FilterBarProps {
  itemSearch: string;
  onItemSearchChange: (value: string) => void;
  dispositionFilter: string;
  onDispositionFilterChange: (value: string) => void;
  visibleCount: number;
  totalCount: number;
}

/** Line-item search + status filter. */
export function PurchaseReturnItemsFilterBar({
  itemSearch,
  onItemSearchChange,
  dispositionFilter,
  onDispositionFilterChange,
  visibleCount,
  totalCount,
}: FilterBarProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <TableSearchInput
        value={itemSearch}
        onChange={onItemSearchChange}
        placeholder={S.units.searchPlaceholder}
        className="w-full sm:max-w-xs"
        clearAriaLabel={S.units.clearSearch}
      />
      <Select
        value={dispositionFilter || "__all__"}
        onValueChange={(v) => onDispositionFilterChange(!v || v === "__all__" ? "" : v)}
      >
        <SelectTrigger className="h-9 w-44">
          <SelectValue>{dispositionFilter || S.units.allDispositions}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{S.units.allDispositions}</SelectItem>
          {DISPOSITION_FILTER_LABELS.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Typography variant="helper" tone="muted" className="ml-auto tabular-nums">
        {S.units.unitCount(visibleCount, totalCount)}
      </Typography>
    </div>
  );
}
