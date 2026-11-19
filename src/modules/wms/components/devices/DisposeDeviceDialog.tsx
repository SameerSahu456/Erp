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
import { useDisposeDevice } from '../../hooks/devices/useDeviceScrap'
import { disposeDeviceSchema, type DisposeDeviceInput } from '../../schemas'
import { DISPOSE_DEVICE_DIALOG_STRINGS as S } from './dispose-device-dialog.strings'

interface DisposeDeviceDialogProps {
  /** The scrapped device to write off. `null` keeps the dialog closed. */
  deviceId: string | null
  /** Shown in the title so the manager confirms the right unit. */
  internalSerial?: string | null
  onClose: () => void
}

/**
 * Write a scrapped unit off the books (device-scrap D2). The backend requires
 * a reason (CP-550 #4), so this is a reason form, not a bare confirm.
 * Mirrors `ScrapDeviceDialog`.
 */
export function DisposeDeviceDialog({ deviceId, internalSerial, onClose }: DisposeDeviceDialogProps) {
  const open = deviceId !== null
  const dispose = useDisposeDevice()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<DisposeDeviceInput>({
    resolver: zodResolver(disposeDeviceSchema),
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
      await dispose.mutateAsync({ id: deviceId, body: { reason: values.reason } })
      close()
    } catch (err) {
      // e.g. the unit still holds installed components (D13) — the backend
      // message names the count.
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
          <Button variant="outline" onClick={requestClose} disabled={dispose.isPending}>
            {S.cancel}
          </Button>
          <Button variant="destructive" onClick={submit} disabled={dispose.isPending}>
            {dispose.isPending && (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            )}
            {dispose.isPending ? S.saving : S.submit}
          </Button>
        </>
      )}
    >
      <div className="space-y-1">
        <Label htmlFor="dispose-reason" required>
          {S.reasonLabel}
        </Label>
        <Textarea
          id="dispose-reason"
          rows={3}
          maxLength={500}
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
