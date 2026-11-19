/** Cancel a request — which, before dispatch, IS the manager's rejection.
 *
 * A reason is always required (spec D21): the not-yet-sent case is exactly the
 * rejection case, and a rejection with no reason tells the engineer nothing. */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { OperationDialog } from '../shared/OperationDialog'
import { FieldError } from '@/components/common/forms/FieldError'

import { useCancelServiceJob } from '../../hooks/vendor-jobs/useServiceJobs'
import { cancelVendorJobSchema, type CancelVendorJobInput } from '../../schemas'
import type { VendorJobSummary } from '../../api/service-jobs'

import { VENDOR_JOB_DIALOG_STRINGS as S } from './vendor-job-dialogs.strings'

interface CancelVendorJobDialogProps {
  deviceId: string
  job: VendorJobSummary | null
  onClose: () => void
}

export function CancelVendorJobDialog({
  deviceId,
  job,
  onClose,
}: CancelVendorJobDialogProps) {
  const open = job !== null
  const cancel = useCancelServiceJob()

  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<CancelVendorJobInput>({
    resolver: zodResolver(cancelVendorJobSchema),
    defaultValues: { cancellation_reason: '' },
  })

  const close = () => {
    form.reset()
    onClose()
  }

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
    if (!job) return
    await cancel.mutateAsync({
      deviceId,
      jobId: job.id,
      body: { cancellation_reason: values.cancellation_reason },
    })
      close()
    } catch (err) {
      // Without this the rejection is an "Uncaught (in promise) ApiError" in
      // the console and NOTHING on screen — the user sees a dialog that will
      // not close and no reason why.
      setSubmitError(err instanceof Error ? err.message : String(err))
    }
  })

  return (
    <OperationDialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={S.cancel.title}
      description={S.cancel.description}
      isDirty={form.formState.isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={cancel.isPending}>
            {S.common.close}
          </Button>
          <Button variant="destructive" onClick={submit} disabled={cancel.isPending}>
            {cancel.isPending && (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            )}
            {cancel.isPending ? S.common.saving : S.cancel.submit}
          </Button>
        </>
      )}
    >
      <div className="space-y-1">
        <Label htmlFor="cancellation_reason" required>
          {S.cancel.reasonLabel}
        </Label>
        <Textarea
          id="cancellation_reason"
          rows={3}
          maxLength={250}
          placeholder={S.cancel.reasonPlaceholder}
          {...form.register('cancellation_reason')}
        />
        <Typography variant="helper" tone="muted">
          {S.cancel.reasonHelp}
        </Typography>
        <FieldError message={form.formState.errors.cancellation_reason?.message} />
        <FieldError message={submitError} />
      </div>
    </OperationDialog>
  )
}
