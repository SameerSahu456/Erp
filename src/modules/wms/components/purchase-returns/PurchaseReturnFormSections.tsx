import { Boxes, Loader2, PackageSearch, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AsyncSelect } from "@/components/ui/async-select";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState";

import type { PurchaseOrderListItem } from "@modules/procurement";

import type { PurchaseReturnFormState } from "../../hooks/purchase-returns/usePurchaseReturnForm";
import { ReasonBulkBar } from "../shared/ReasonBulkBar";
import { ReturnableUnitTable } from "./ReturnableUnitTable";
import {
  PURCHASE_RETURN_STRINGS as S,
  RETURN_REASON_OPTIONS,
} from "./purchase-returns.strings";
import {
  poLabel,
  usePurchaseOrderPickerOptions,
} from "./purchase-return-form-helpers";

type FormProps = { f: PurchaseReturnFormState };

/** Cancel (secondary, left) + primary Raise (right) footer actions. */
export function PurchaseReturnFormFooterActions({ f }: FormProps) {
  return (
    // Cancel (secondary, left) + primary Raise (right) — a form footer needs
    // its Cancel, routed through the discard guard (§3.2/§10).
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-9"
        onClick={() => f.guard.attempt(f.navigateBack)}
      >
        {S.cancel}
      </Button>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button
              type="button"
              className="h-9"
              disabled={!f.canSubmit || f.isPending}
              onClick={f.submit}
            >
              {f.isPending && (
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              )}
              {S.raiseButton(f.selectedCount)}
            </Button>
          </TooltipTrigger>
          {f.raiseBlockReason && !f.isPending && (
            <TooltipContent>{f.raiseBlockReason}</TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

/** Return source: which PO the units came in on, plus optional notes. */
export function PurchaseReturnSourceCard({ f }: FormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Undo2 className="size-4 text-primary" />
          {S.sourceSection}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pr-po-picker" required>
            {S.poPicker}
          </Label>
          <AsyncSelect<PurchaseOrderListItem>
            id="pr-po-picker"
            value={f.poOption}
            onValueChange={f.handlePoChange}
            useOptions={usePurchaseOrderPickerOptions}
            toLabel={poLabel}
            placeholder={S.poPickerPlaceholder}
            searchPlaceholder={S.poPickerPlaceholder}
            searchable
            loadOnOpen
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pr-notes">{S.headerNotes}</Label>
          <Textarea
            id="pr-notes"
            value={f.headerNotes}
            onChange={(e) => f.setHeaderNotes(e.target.value)}
            placeholder={S.headerNotesPlaceholder}
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/** Units to return. */
export function PurchaseReturnUnitsCard({ f }: FormProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Boxes className="size-4 text-primary" />
          {S.table.unitsTitle}
        </CardTitle>
        {f.selectedCount > 0 && (
          <Typography variant="helper" tone="muted">
            {S.selectedCount(f.selectedCount)}
          </Typography>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {f.selectedCount > 0 && (
          <ReasonBulkBar
            selectedCount={f.selectedCount}
            options={RETURN_REASON_OPTIONS}
            strings={S.bulk}
            onApply={f.applyBulk}
          />
        )}
        <UnitsCardContent f={f} />
      </CardContent>
    </Card>
  );
}

// No PO → pick one; then loading → error → empty → the unit table.
function UnitsCardContent({ f }: FormProps) {
  if (!f.poId) {
    return (
      <EmptyState
        icon={PackageSearch}
        title={S.table.selectPoTitle}
        description={S.table.selectPoFirst}
      />
    );
  }
  if (f.unitsQuery.isLoading) {
    return (
      <div className="space-y-2" aria-hidden>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  if (f.unitsQuery.isError) {
    return <LoadErrorState error={f.unitsQuery.error} fallback={S.table.error} compact />;
  }
  if (f.units.length === 0) {
    return (
      <EmptyState
        icon={Boxes}
        title={S.table.emptyTitle}
        description={S.table.empty}
      />
    );
  }
  return (
    <ReturnableUnitTable
      units={f.units}
      selections={f.selections}
      onToggle={f.toggle}
      onChangeReason={f.changeReason}
      onChangeNotes={f.changeNotes}
    />
  );
}
