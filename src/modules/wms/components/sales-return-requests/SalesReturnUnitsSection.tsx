import { Boxes } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { Typography } from "@/components/ui/typography"
import { FieldError } from "@/components/common/forms/FieldError"
import { EmptyState } from "@/components/common/feedback/EmptyState"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import type { SalesReturnRequestFormState } from "../../hooks/sales-return-requests/useSalesReturnRequestForm"
import { ReasonBulkBar } from "../shared/ReasonBulkBar"
import { ReturnSectionCard } from "./SalesReturnSectionCard"
import { SalesReturnUnitTable } from "./SalesReturnUnitTable"
import { SALES_RETURN_REQUESTS_STRINGS as S } from "./sales-return-requests.strings"
import { BULK_REASON_OPTIONS } from "./sales-return-request-form-helpers"

type SalesReturnUnitsSectionProps = Pick<
  SalesReturnRequestFormState,
  | "unitsError"
  | "salesOrderId"
  | "selectedUnits"
  | "unitsQuery"
  | "availableUnits"
  | "selectionMap"
  | "toggleUnit"
  | "setManyUnits"
  | "updateUnit"
  | "applyBulk"
>

/** Units — the bulk reason bar plus the per-unit checklist of the order. */
export function SalesReturnUnitsSection({
  unitsError,
  salesOrderId,
  selectedUnits,
  unitsQuery,
  availableUnits,
  selectionMap,
  toggleUnit,
  setManyUnits,
  updateUnit,
  applyBulk,
}: SalesReturnUnitsSectionProps) {
  return (
    <ReturnSectionCard
      icon={Boxes}
      title={S.form.sections.units.title}
      description={S.form.sections.units.description}
      contentClassName="space-y-3"
      action={
        selectedUnits.length > 0 ? (
          <Typography variant="helper" tone="muted" className="shrink-0">
            {S.form.unitsStep.selectedCount(selectedUnits.length)}
          </Typography>
        ) : undefined
      }
    >
      {/* Global reason + note — hidden until units are ticked, then it
          stamps every selected unit at once (like the Purchase Return
          form). A single unit can still override its reason in its row. */}
      {selectedUnits.length > 0 && (
        <ReasonBulkBar
          selectedCount={selectedUnits.length}
          options={BULK_REASON_OPTIONS}
          strings={S.form.bulk}
          onApply={applyBulk}
        />
      )}

      {!salesOrderId && (
        <EmptyState
          icon={Boxes}
          title={S.form.unitsStep.heading}
          description={S.form.unitsStep.pickOrderFirst}
        />
      )}

      {/* A loading skeleton while the unit checklist loads, never a blank
          gap or a premature "no units" message (§0.6). */}
      {salesOrderId && unitsQuery.isLoading && (
        <div className="space-y-2" aria-hidden>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {salesOrderId && !unitsQuery.isLoading && unitsQuery.isError && (
        <LoadErrorState
          error={unitsQuery.error}
          fallback={S.form.unitsStep.error}
          compact
        />
      )}

      {salesOrderId &&
        !unitsQuery.isLoading &&
        !unitsQuery.isError &&
        availableUnits.length === 0 && (
          <EmptyState icon={Boxes} title={S.form.unitsStep.empty} />
        )}

      {availableUnits.length > 0 && (
        <div className="space-y-2">
          <SalesReturnUnitTable
            units={availableUnits}
            selections={selectionMap}
            onToggle={toggleUnit}
            onSetMany={setManyUnits}
            onChangeReason={(id, itemReason) => updateUnit(id, { itemReason })}
            onChangeNotes={(id, notes) => updateUnit(id, { notes })}
          />
          <Typography variant="helper" tone="muted">
            {S.form.unitsStep.pinNote}
          </Typography>
        </div>
      )}
      <FieldError message={unitsError} />
    </ReturnSectionCard>
  )
}
