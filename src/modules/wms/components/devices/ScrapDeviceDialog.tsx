import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { FieldError } from '@/components/common/forms/FieldError'

import { OperationDialog } from '../shared/OperationDialog'
import { useScrapDevice } from '../../hooks/devices/useDeviceScrap'
import { scrapDeviceSchema, type ScrapDeviceInput } from '../../schemas'
import { SCRAP_DEVICE_DIALOG_STRINGS as S } from './scrap-device-dialog.strings'

interface ScrapDeviceDialogProps {
  /** The device to condemn. `null` keeps the dialog closed. */
  deviceId: string | null
  /** Shown in the title so the engineer confirms the right unit. */
  internalSerial?: string | null
  onClose: () => void
}

/**
 * The engineer's write-off action (device-scrap D1/D3/D5). Unconditional and
 * reason-only — never a location, never blocked by shelf capacity. Mounted on
 * every surface an engineer uses: device detail, and the inspection / repair /
 * QC stage queues. Modelled on `CancelVendorJobDialog` (RHF + Zod, a single
 * required reason field, the shared `OperationDialog` shell).
 */
export function ScrapDeviceDialog({ deviceId, internalSerial, onClose }: ScrapDeviceDialogProps) {
  const open = deviceId !== null
  const scrap = useScrapDevice()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<ScrapDeviceInput>({
    resolver: zodResolver(scrapDeviceSchema),
    defaultValues: { reason: '' },
  })

  const close = () => {
    form.reset()
    setSubmitError(null)
    onClose()
  }

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    if (!deviceId) return
    try {
      await scrap.mutateAsync({ id: deviceId, body: { reason: values.reason } })
      close()
    } catch (err) {
      // Without this the rejection (e.g. DEVICE_IS_ISSUED_RETURN_FIRST on a
      // stale row) is an uncaught promise and nothing on screen.
      setSubmitError(err instanceof Error ? err.message : String(err))
    }
  })

  return (
    <OperationDialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={internalSerial ? S.titleFor(internalSerial) : S.title}
      description={S.description}
      isDirty={form.formState.isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={scrap.isPending}>
            {S.cancel}
          </Button>
          <Button variant="destructive" onClick={submit} disabled={scrap.isPending}>
            {scrap.isPending && (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            )}
            {scrap.isPending ? S.saving : S.submit}
          </Button>
        </>
      )}
    >
      <div className="space-y-1">
        <Label htmlFor="scrap-reason" required>
          {S.reasonLabel}
        </Label>
        <Textarea
          id="scrap-reason"
          rows={3}
          maxLength={2000}
          placeholder={S.reasonPlaceholder}
          {...form.register('reason')}
        />
        <Typography variant="helper" tone="muted">
          {S.reasonHelp}
        </Typography>
        <FieldError message={form.formState.errors.reason?.message} />
        <FieldError message={submitError} />
      </div>
    </OperationDialog>
  )
}
