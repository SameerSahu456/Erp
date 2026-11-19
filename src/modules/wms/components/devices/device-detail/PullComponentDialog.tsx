import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { FieldError } from '@/components/common/forms/FieldError'
import type { StockItemComponent } from '@modules/ims'

import { OperationDialog } from '../../shared/OperationDialog'
import { ChoiceCard } from '../../shared/ChoiceCard'
import { RackBinLocationPicker } from '../../shared/RackBinLocationPicker'
import { usePullStockItemComponent } from '../../../hooks/devices/useDeviceComposition'
import { COMPONENTS_CARD_STRINGS as S } from './components-card.strings'

type Condition = 'available' | 'repair' | 'scrap'

/** Pull a component out of a device and return it to stock.
 *
 *  The condition choice is the only real decision, and it decides where the
 *  part lands (D6):
 *   - GOOD → inward QC. It was only ever tested INSIDE this machine, so it
 *     earns `available` through a QC pass then rack-assign — it does NOT go
 *     straight to sellable, and the copy says so rather than letting the
 *     operator discover it.
 *   - FAULTY → the repair queue.
 *   - DEAD → scrapped, with the notes as the required scrap reason.
 *
 *  Either way the part records which device it came out of
 *  (`pulled_from_stock_item_id`, D7) — the audit trail that replaced the old
 *  prohibition on pulling ops-added components (D8). */
export function PullComponentDialog({
  component,
  deviceId,
  deviceWarehouseId,
  onClose,
}: {
  /** The component to pull. `null` keeps the dialog closed. */
  component: StockItemComponent | null
  deviceId: string
  /** Scopes the optional rack/bin picker; the part lands in the device's warehouse. */
  deviceWarehouseId?: string | null
  onClose: () => void
}) {
  const open = component !== null
  const [condition, setCondition] = useState<Condition | ''>('')
  const [notes, setNotes] = useState('')
  const [mfgSerial, setMfgSerial] = useState('')
  // Where the part is parked while it waits for QC / repair. Optional; a
  // scrapped part is placed through the scrap flow instead.
  const [locationId, setLocationId] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const pull = usePullStockItemComponent()

  const isDirty = [condition, notes, mfgSerial, locationId].some((v) => v !== '')
  // D10: a label inside a device is often unreadable until the part is out.
  // Offered only while the part has none; a recorded serial is changed
  // through serial correction, never overwritten here.
  const canAddSerial = !component?.manufacturer_serial
  const isScrap = condition === 'scrap'

  const close = () => {
    setCondition('')
    setNotes('')
    setMfgSerial('')
    setLocationId('')
    setFieldError(null)
    onClose()
  }

  const submit = async () => {
    setFieldError(null)
    if (!component || !condition) {
      setFieldError(S.pull.conditionRequired)
      return
    }
    if (isScrap && !notes.trim()) {
      setFieldError(S.pull.scrapReasonRequired)
      return
    }
    try {
      await pull.mutateAsync({
        stockItemId: deviceId,
        body: {
          component_id: component.id,
          result_status: condition,
          destination_location_id: pullDestination(condition, locationId),
          manufacturer_serial: (canAddSerial && mfgSerial.trim()) || null,
          notes: notes.trim() || null,
        },
      })
      close()
    } catch {
      // The hook toasts the typed error; keep the dialog open.
    }
  }

  const label =
    [component?.part_name, component?.variant_name].filter(Boolean).join(' · ') ||
    component?.part_number ||
    ''

  return (
    <OperationDialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={S.pull.title}
      description={S.pull.description}
      isDirty={isDirty}
      headerExtra={
        component ? (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5">
            <Typography variant="body" className="truncate">
              {label}
            </Typography>
            <Typography variant="helper" tone="muted" asChild>
              <p className="truncate">
                {component.internal_serial || component.manufacturer_serial || S.row.noSerial}
              </p>
            </Typography>
          </div>
        ) : null
      }
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose}>
            Cancel
          </Button>
          <Button
            variant={isScrap ? 'destructive' : 'default'}
            onClick={() => void submit()}
            disabled={!condition || pull.isPending}
          >
            {pull.isPending ? S.pull.saving : S.pull.submit}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label required>{S.pull.conditionLabel}</Label>
          {/* This is the only real decision, and it decides where the part
              lands (D6), so each option states its consequence up front —
              "Good" not meaning "sellable" is the surprise we surface before
              the commit, not after. */}
          <ConditionChoices
            value={condition}
            onPick={(next) => {
              setCondition(next)
              setFieldError(null)
            }}
          />
        </div>

        <PullLocationField
          show={condition !== '' && !isScrap}
          warehouseId={deviceWarehouseId}
          enabled={open}
          value={locationId}
          onChange={setLocationId}
        />

        {canAddSerial ? (
          <div className="space-y-1.5">
            <Label htmlFor="pull-mfg-serial">{S.pull.mfgSerialLabel}</Label>
            <Input
              id="pull-mfg-serial"
              value={mfgSerial}
              placeholder={S.pull.mfgSerialPlaceholder}
              onChange={(e) => setMfgSerial(e.target.value)}
            />
            <Typography variant="helper" tone="muted" asChild>
              <p>{S.pull.mfgSerialHelp}</p>
            </Typography>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="pull-notes" required={isScrap}>
            {isScrap ? S.pull.scrapReasonLabel : S.pull.notesLabel}
          </Label>
          <Input
            id="pull-notes"
            value={notes}
            placeholder={isScrap ? S.pull.scrapReasonPlaceholder : undefined}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <FieldError message={fieldError} />
      </div>
    </OperationDialog>
  )
}

const CONDITION_CHOICES: { value: Condition; title: string; subtitle: string }[] = [
  { value: 'available', title: S.pull.good, subtitle: S.pull.goodHelp },
  { value: 'repair', title: S.pull.repair, subtitle: S.pull.repairHelp },
  { value: 'scrap', title: S.pull.scrap, subtitle: S.pull.scrapHelp },
]

/** Where the pulled part goes: QC, repair or scrap. */
function ConditionChoices({
  value,
  onPick,
}: {
  value: Condition | ''
  onPick: (next: Condition) => void
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {CONDITION_CHOICES.map((c) => (
        <ChoiceCard
          key={c.value}
          selected={value === c.value}
          onClick={() => onPick(c.value)}
          title={c.title}
          subtitle={c.subtitle}
        />
      ))}
    </div>
  )
}

/** Optional rack/bin where a part waits for QC or repair. */
function PullLocationField({
  show,
  warehouseId,
  enabled,
  value,
  onChange,
}: {
  show: boolean
  warehouseId?: string | null
  enabled: boolean
  value: string
  onChange: (locationId: string) => void
}) {
  if (!show || !warehouseId) return null
  return (
    <div className="space-y-1.5">
      <RackBinLocationPicker warehouseId={warehouseId} enabled={enabled} value={value} onChange={onChange} />
      <Typography variant="helper" tone="muted" asChild>
        <p>{S.pull.locationHelp}</p>
      </Typography>
    </div>
  )
}

/** A scrapped part is placed through the scrap flow, never here. */
function pullDestination(condition: Condition, locationId: string): string | null {
  return condition === 'scrap' || !locationId ? null : locationId
}
