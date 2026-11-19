import { useState } from 'react'
import { Loader2, PackageOpen } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldError } from '@/components/common/forms/FieldError'

import { OperationDialog } from '../shared/OperationDialog'
import { useUnscrapDevice } from '../../hooks/devices/useDeviceScrap'
import type { UnscrapTarget } from '../../api'
import { computeRestoreTargets } from './scrap-helpers'
import { UNSCRAP_DEVICE_DIALOG_STRINGS as S } from './unscrap-device-dialog.strings'

interface UnscrapDeviceDialogProps {
  /** The device to restore. `null` keeps the dialog closed. */
  deviceId: string | null
  internalSerial?: string | null
  /** The status snapshotted at the moment this unit was condemned
   *  (`scrap_prior_status`) — decides which targets are legal (D9). */
  scrapPriorStatus: string | null | undefined
  /** Whether the unit currently holds a location — `available` additionally
   *  requires one, since sellable means racked. */
  hasLocation: boolean
  /** Whether the unit has a warehouse. A pipeline target opens an op and an op
   *  is warehouse-scoped, so the backend refuses rather than half-restoring —
   *  don't offer it either. */
  hasWarehouse?: boolean
  onClose: () => void
}

/**
 * The store/warehouse manager's override of a condemnation (device-scrap D9).
 * The restore targets are DATA-DRIVEN from `scrap_prior_status`, never a fixed
 * list — a unit condemned mid-pipeline never passed QC, so offering
 * "Available" for it would teach the wrong model and the backend would
 * refuse it anyway. When no legal target exists (an unknown/null snapshot),
 * this renders an explanation instead of a broken picker — never a dialog
 * with nothing the operator can submit.
 */
export function UnscrapDeviceDialog({
  deviceId,
  internalSerial,
  scrapPriorStatus,
  hasLocation,
  hasWarehouse = true,
  onClose,
}: UnscrapDeviceDialogProps) {
  const open = deviceId !== null
  const unscrap = useUnscrapDevice()
  const [target, setTarget] = useState<UnscrapTarget | ''>('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const targets = computeRestoreTargets(scrapPriorStatus, hasLocation, hasWarehouse)
  const dirty = target !== ''

  const close = () => {
    setTarget('')
    setSubmitError(null)
    onClose()
  }

  const submit = async () => {
    if (!deviceId || !target) return
    setSubmitError(null)
    try {
      await unscrap.mutateAsync({ id: deviceId, body: { target } })
      close()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <OperationDialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={internalSerial ? S.titleFor(internalSerial) : S.title}
      description={targets.length > 0 ? S.description : undefined}
      isDirty={dirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={unscrap.isPending}>
            {S.cancel}
          </Button>
          {targets.length > 0 && (
            <Button onClick={() => void submit()} disabled={!target || unscrap.isPending}>
              {unscrap.isPending && (
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              )}
              {unscrap.isPending ? S.saving : S.submit}
            </Button>
          )}
        </>
      )}
    >
      {targets.length === 0 ? (
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-3">
          <PackageOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="space-y-1">
            <Typography variant="body-strong">{S.unknownStateTitle}</Typography>
            <Typography variant="helper" tone="muted">
              {S.unknownStateBody}
            </Typography>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="unscrap-target" required>
            {S.targetLabel}
          </Label>
          <Select
            value={target}
            onValueChange={(v) => setTarget(v as UnscrapTarget)}
          >
            <SelectTrigger id="unscrap-target" className="w-full sm:max-w-md">
              <SelectValue placeholder={S.targetPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {targets.map((t) => (
                <SelectItem key={t} value={t}>
                  {S.targets[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={submitError} />
        </div>
      )}
    </OperationDialog>
  )
}
