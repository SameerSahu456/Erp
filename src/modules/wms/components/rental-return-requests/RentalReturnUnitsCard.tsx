import { useFormState, useWatch } from "react-hook-form"
import { Boxes } from "lucide-react"

import { TruncatedText } from "@/components/common/display/TruncatedText"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Typography } from "@/components/ui/typography"
import { FieldError } from "@/components/common/forms/FieldError"
import { EmptyState } from "@/components/common/feedback/EmptyState"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import { RentalReturnUnitTable } from "./RentalReturnUnitTable"
import { RENTAL_RETURN_REQUESTS_STRINGS as S } from "./rental-return-requests.strings"
import type { RentalReturnFormState } from "../../hooks/rental-return-requests/useRentalReturnForm"

const U = S.form.unitsStep

type Props = Pick<
  RentalReturnFormState,
  | "form"
  | "orderId"
  | "units"
  | "unitsQuery"
  | "selected"
  | "selectedCount"
  | "toggleUnit"
  | "setManyUnits"
  | "lockedUnit"
  | "unlockUnits"
>

/** The one unit a device-level Return was raised for — shown, not asked. */
function LockedUnit({
  unit,
  onUnlock,
}: {
  unit: NonNullable<RentalReturnFormState["lockedUnit"]>
  onUnlock: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Fact label={U.lockedModel} value={unit.variant_name || unit.part_name} />
        <Fact label={U.lockedInternal} value={unit.internal_serial} />
        <Fact label={U.lockedManufacturer} value={unit.manufacturer_serial} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Typography variant="helper" tone="muted">
          {U.lockedNote}
        </Typography>
        <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={onUnlock}>
          {U.chooseOther}
        </Button>
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Typography variant="caption" tone="muted">
        {label}
      </Typography>
      <TruncatedText value={value} className="max-w-full" />
    </div>
  )
}

/** What the card shows for the current order: a prompt, a skeleton, an
 *  error, an empty state, or the unit table. */
function UnitsBody(props: Omit<Props, "form" | "selectedCount"> & { accountId: string }) {
  const { orderId, units, unitsQuery, accountId } = props
  if (!orderId) {
    return <EmptyState icon={Boxes} title={accountId ? U.pickOrder : U.pickCustomer} />
  }
  if (unitsQuery.isLoading) {
    return (
      <div className="space-y-2" aria-hidden>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }
  if (unitsQuery.isError) {
    return <LoadErrorState error={unitsQuery.error} fallback={U.error} compact />
  }
  if (units.length === 0) return <EmptyState icon={Boxes} title={U.empty} />
  return (
    <div className="space-y-2">
      <RentalReturnUnitTable
        units={units}
        selected={props.selected}
        onToggle={props.toggleUnit}
        onSetMany={props.setManyUnits}
      />
      <Typography variant="helper" tone="muted">
        {U.pinNote}
      </Typography>
    </div>
  )
}

/** The order's units on rent, one checkbox each — as on a sales return. */
export function RentalReturnUnitsCard({ form, selectedCount, ...rest }: Props) {
  const accountId = useWatch({ control: form.control, name: "accountId" })
  // useFormState, not form.formState: a child reading the parent's proxy is
  // not re-rendered when validation fails, so the message never showed.
  const { errors } = useFormState({ control: form.control, name: "units" })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Boxes className="size-4" />
          {rest.lockedUnit ? U.lockedTitle : S.form.steps.units}
        </CardTitle>
        {selectedCount > 0 && (
          <Typography variant="helper" tone="muted" className="shrink-0">
            {U.selectedCount(selectedCount)}
          </Typography>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {rest.lockedUnit ? (
          <LockedUnit unit={rest.lockedUnit} onUnlock={rest.unlockUnits} />
        ) : (
          <UnitsBody {...rest} accountId={accountId} />
        )}
        <FieldError message={errors.units?.message ?? errors.units?.root?.message} />
      </CardContent>
    </Card>
  )
}
