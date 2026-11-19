import { useState } from "react"
import { Link } from "react-router-dom"
import { PackagePlus } from "lucide-react"

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AsyncSelect, type AsyncSelectOption } from "@/components/ui/async-select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import {
  PARTS_NEW_PATH,
  partOptionDescription,
  useVariant,
  useVariantSearchOptions,
} from "@modules/ims"

import type { InwardException } from "../../api"
import { useBringInwardExceptionIntoStock } from "../../hooks/inward-exceptions/useInwardExceptions"
import { INWARD_EXCEPTIONS_STRINGS } from "./inward-exceptions.strings"

const S = INWARD_EXCEPTIONS_STRINGS.stockDialog

interface Props {
  row: InwardException
  onClose: () => void
}

/** Stock a settled rental unit's box. A unit already mapped to an IMS part
 *  is stocked as it; one with none asks for the part to be created first and
 *  picked here. Mounted only while open, so each opening starts empty. */
export function BringIntoStockDialog({ row, onClose }: Props) {
  const stock = useBringInwardExceptionIntoStock()
  const mapped = row.rental_unit?.part_variant_id ?? null
  const [part, setPart] = useState<AsyncSelectOption | null>(null)
  const [notes, setNotes] = useState("")
  const canConfirm = (!!mapped || !!part) && !stock.isPending
  // `mutate`, not `mutateAsync`: the hook's onError already toasts.
  const confirm = () =>
    stock.mutate(
      {
        id: row.id,
        body: { part_variant_id: mapped ? null : (part?.id ?? null), notes: notes.trim() || null },
      },
      { onSuccess: onClose },
    )
  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={S.title}
      description={S.description}
      isDirty={!!part || !!notes}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={stock.isPending}>
            {S.cancel}
          </Button>
          <Button onClick={confirm} disabled={!canConfirm}>
            {S.confirm}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        {mapped ? (
          <MappedPart variantId={mapped} />
        ) : (
          <PickPart row={row} part={part} onPartChange={setPart} />
        )}
        <div className="space-y-2">
          <Label htmlFor="iex-stock-notes">{S.notes}</Label>
          <Textarea
            id="iex-stock-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </div>
    </OperationDialog>
  )
}

/** The IMS part the rental unit is already mapped to. */
function MappedPart({ variantId }: { variantId: string }) {
  const variant = useVariant(variantId).data
  return (
    <div className="space-y-1">
      <Label>{S.stockedAs}</Label>
      <Typography variant="body" className="min-w-0 break-words">
        {variant ? `${variant.name} · ${variant.sku_code}` : S.loadingPart}
      </Typography>
    </div>
  )
}

/** No IMS part on the unit: say so, link to create one, then pick it. */
function PickPart({
  row,
  part,
  onPartChange,
}: {
  row: InwardException
  part: AsyncSelectOption | null
  onPartChange: (v: AsyncSelectOption | null) => void
}) {
  return (
    <>
      <Alert>
        <PackagePlus aria-hidden />
        <AlertTitle>{S.noPartTitle}</AlertTitle>
        <AlertDescription>
          {S.noPart}
          {row.rental_unit?.part_number && ` ${S.bookedAs(row.rental_unit.part_number)}`}
        </AlertDescription>
        <AlertAction>
          {/* A new tab, so this dialog and its notes survive making the part. */}
          <Button
            size="sm"
            variant="outline"
            render={<Link to={PARTS_NEW_PATH} target="_blank" rel="noopener noreferrer" />}
          >
            {S.createPart}
          </Button>
        </AlertAction>
      </Alert>
      <div className="space-y-2">
        <Label required>{S.part}</Label>
        <AsyncSelect
          value={part}
          onValueChange={onPartChange}
          useOptions={useVariantSearchOptions}
          toLabel={(v) => `${v.part_name} · ${v.name}`}
          getDescription={partOptionDescription}
          placeholder={S.partPlaceholder}
          clearable
          className="w-full"
        />
        <Typography variant="helper" tone="muted">
          {S.partHelper}
        </Typography>
      </div>
    </>
  )
}
