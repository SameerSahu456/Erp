import { Boxes } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { EmptyState } from "@/components/common/feedback/EmptyState"
import { FieldError } from "@/components/common/forms/FieldError"

import type { ReplacementRequestFormState } from "../../hooks/replacement-requests/useReplacementRequestForm"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import { SectionCard } from "../shared/section-primitives"
import { ReplacementUnitTable } from "./ReplacementUnitTable"

/** The units area's one-of-four state: no order yet, loading, none, or the table. */
function UnitsStepContent({ form }: { form: ReplacementRequestFormState }) {
  if (!form.order) {
    return <EmptyState icon={Boxes} title={S.form.units.pickOrderFirst} />
  }
  if (form.loading) {
    // A loading line, never a blank gap while the units load (§0.6).
    return (
      <div className="space-y-2">
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="h-14 animate-pulse rounded-md bg-muted" />
        <div className="h-14 animate-pulse rounded-md bg-muted" />
      </div>
    )
  }
  if (form.rowUnits.length === 0) {
    return <EmptyState icon={Boxes} title={S.form.units.none} />
  }
  return (
    <div className="space-y-2">
      {form.lockedUnit ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Typography variant="helper" tone="muted">
            {S.form.units.lockedNote}
          </Typography>
          <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={form.unlockUnits}>
            {S.form.units.chooseOther}
          </Button>
        </div>
      ) : null}
      <ReplacementUnitTable
        units={form.rowUnits}
        picks={form.picks}
        extrasOf={form.extrasOf}
        indexOf={form.indexOfUnit}
        errorsOf={form.unitErrorsOf}
        salesOrderId={form.order?.id ?? ""}
        onToggle={form.toggleUnit}
        onSetMany={form.setManyUnits}
        onPatch={form.patchUnit}
        onAddPart={form.addPart}
        onRemovePart={form.removePart}
        onPatchMany={form.patchMany}
      />
      <Typography variant="helper" tone="muted">
        {S.form.units.serialsHelp}
      </Typography>
    </div>
  )
}

/** 2 — Units */
export function ReplacementUnitsStep({
  form,
}: {
  form: ReplacementRequestFormState
}) {
  const { totalLines } = form
  return (
    <SectionCard
      step={2}
      title={S.form.units.title}
      description={S.form.units.sectionDescription}
      action={
        totalLines > 0 ? (
          <Typography variant="helper" tone="muted" className="shrink-0">
            {S.form.units.fanOutHelp(totalLines)}
          </Typography>
        ) : undefined
      }
    >
      <div id="rr-units-card" className="space-y-4">
        <UnitsStepContent form={form} />
        <FieldError message={form.errors.units?.message} />
      </div>
    </SectionCard>
  )
}
