import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Typography } from '@/components/ui/typography'
import { AsyncSelect } from '@/components/ui/async-select'
import { FieldError } from '@/components/common/forms/FieldError'
import { NumericInput } from '@/components/common/forms/NumericInput'
import {
  useVariantsListInfinite,
  type StockItemComponent,
  type VariantListItem,
  partOptionDescription,
} from '@modules/ims'

import { OperationDialog } from '../../shared/OperationDialog'
import { useRecordFoundDeviceComponent } from '../../../hooks/devices/useDeviceContents'
import type { DeviceComponentFoundRequest } from '../../../api'
import { InsteadOfSelect } from './InsteadOfSelect'
import { COMPONENTS_CARD_STRINGS as S } from './components-card.strings'

const MAX_QUANTITY = 50

type Picked = { id: string; label: string }

type AddForm = {
  serial: string
  part: Picked | null
  description: string
  partNumber: string
  quantity: number
  position: string
  insteadOf: string | null
}

const EMPTY: AddForm = {
  serial: '',
  part: null,
  description: '',
  partNumber: '',
  quantity: 1,
  position: '',
  insteadOf: null,
}

/** Several at once only for a known IMS part with no serial: a serial or an
 *  "instead of" names one unit. */
function allowsQuantity(form: AddForm): boolean {
  return form.part !== null && !form.serial.trim() && form.insteadOf === null
}

/** Validate the form and build the request body, or return the error copy. */
function toRequest(form: AddForm): DeviceComponentFoundRequest | string {
  const serial = form.serial.trim() || null
  const description = form.description.trim() || null
  if (!form.part && !serial && !description) return S.add.needSomething
  const quantity = allowsQuantity(form) ? form.quantity : 1
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return S.add.quantityRange
  }
  return {
    serial,
    description,
    part_variant_id: form.part?.id ?? null,
    part_number: form.partNumber.trim() || null,
    position: form.position.trim() || null,
    quantity,
    instead_of_component_id: form.insteadOf,
  }
}

/** Add a part that is inside this device but not recorded yet — the one way to
 *  add a component on the device page, for a backfill of what is already
 *  inside or a find at inspection / repair / QC (component-tracking D1,
 *  inward-verification D7/D10, return D5).
 *
 *  The operator records only what they know: a scanned serial alone links a
 *  unit we already track (nothing is duplicated); otherwise the IMS part, or a
 *  description a store manager identifies later. Fitting a part from the shelf
 *  is a spare request, so the store keeps control of stock. */
export function AddComponentDialog({
  open,
  deviceId,
  deviceWarehouseId,
  missing,
  onClose,
}: {
  open: boolean
  deviceId: string
  deviceWarehouseId?: string | null
  /** Components marked missing on this device — a find may replace one (D7). */
  missing: StockItemComponent[]
  onClose: () => void
}) {
  const [form, setForm] = useState<AddForm>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const record = useRecordFoundDeviceComponent()

  const set = (patch: Partial<AddForm>) => {
    setForm((prev) => ({ ...prev, ...patch }))
    setError(null)
  }
  // Any touched field makes the dialog dirty, so every close path routes
  // through OperationDialog's discard guard (PAGE-UI-RULES §3.1).
  const isDirty = JSON.stringify(form) !== JSON.stringify(EMPTY)

  const close = () => {
    setForm(EMPTY)
    setError(null)
    onClose()
  }

  const submit = async () => {
    const body = toRequest(form)
    if (typeof body === 'string') {
      setError(body)
      return
    }
    try {
      await record.mutateAsync({ deviceId, body })
      close()
    } catch {
      // The hook toasts the typed error; keep the input for a correction.
    }
  }

  return (
    <OperationDialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={S.add.title}
      description={S.add.description}
      isDirty={isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose}>
            {S.add.cancel}
          </Button>
          {/* A component is minted into the device's warehouse, so the API
              refuses without one. */}
          <Button onClick={() => void submit()} disabled={!deviceWarehouseId || record.isPending}>
            {record.isPending ? S.add.saving : S.add.submit}
          </Button>
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        <AddComponentFields form={form} set={set} />
        <InsteadOfSelect
          missing={missing}
          value={form.insteadOf}
          onChange={(insteadOf) => set({ insteadOf })}
        />
        <FieldError message={error} />
        {!deviceWarehouseId ? (
          <Typography variant="helper" tone="warning" asChild>
            <p>{S.add.noWarehouse}</p>
          </Typography>
        ) : null}
      </div>
    </OperationDialog>
  )
}

/** Serial, part (or description), quantity and position. */
function AddComponentFields({
  form,
  set,
}: {
  form: AddForm
  set: (patch: Partial<AddForm>) => void
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="add-component-serial">{S.add.serialLabel}</Label>
        <Input
          id="add-component-serial"
          maxLength={255}
          value={form.serial}
          placeholder={S.add.serialPlaceholder}
          onChange={(e) => set({ serial: e.target.value })}
        />
        <Typography variant="helper" tone="muted" asChild>
          <p>{S.add.serialHelp}</p>
        </Typography>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="add-component-part">{S.add.partLabel}</Label>
        <AsyncSelect<VariantListItem>
          id="add-component-part"
          value={form.part}
          // AsyncSelect hands back its own {id,label} option, not the raw row.
          onValueChange={(opt) => set({ part: opt ? { id: opt.id, label: opt.label } : null })}
          useOptions={useVariantsListInfinite}
          toLabel={(v) => v.display_title || `${v.part_number} · ${v.name}`}
          getDescription={partOptionDescription}
          placeholder={S.add.partPlaceholder}
          searchPlaceholder={S.add.partPlaceholder}
          clearable
          chevron="down"
        />
      </div>
      {form.part ? null : <DescriptionFields form={form} set={set} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-component-quantity">{S.add.quantityLabel}</Label>
          {/* A 1–50 count never needs a full-width box. */}
          <NumericInput
            id="add-component-quantity"
            className="w-24"
            integer
            min={1}
            max={MAX_QUANTITY}
            disabled={!allowsQuantity(form)}
            value={allowsQuantity(form) ? form.quantity : 1}
            onChange={(quantity) => set({ quantity })}
          />
          <Typography variant="helper" tone="muted" asChild>
            <p>{allowsQuantity(form) ? S.add.quantityHelp : S.add.quantityNeedsPart}</p>
          </Typography>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-component-position">{S.add.positionLabel}</Label>
          <Input
            id="add-component-position"
            maxLength={50}
            value={form.position}
            placeholder={S.add.positionPlaceholder}
            onChange={(e) => set({ position: e.target.value })}
          />
        </div>
      </div>
    </>
  )
}

/** When the IMS part is not known: what it is, for a store manager to identify. */
function DescriptionFields({
  form,
  set,
}: {
  form: AddForm
  set: (patch: Partial<AddForm>) => void
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="add-component-description">{S.add.descriptionLabel}</Label>
        <Textarea
          id="add-component-description"
          rows={2}
          maxLength={255}
          value={form.description}
          placeholder={S.add.descriptionPlaceholder}
          onChange={(e) => set({ description: e.target.value })}
        />
        <Typography variant="helper" tone="muted" asChild>
          <p>{S.add.descriptionHelp}</p>
        </Typography>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="add-component-part-number">{S.add.partNumberLabel}</Label>
        <Input
          id="add-component-part-number"
          maxLength={100}
          value={form.partNumber}
          placeholder={S.add.partNumberPlaceholder}
          onChange={(e) => set({ partNumber: e.target.value })}
        />
      </div>
    </>
  )
}
