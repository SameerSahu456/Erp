/** Dispatch a raised job, or send a returned one out again.
 *
 * Both actions are the same decision by the same person (the store manager),
 * so they share one dialog — `mode` only swaps the copy and which mutation
 * fires. Send-again additionally demands a note. */
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { OperationDialog } from '../shared/OperationDialog'
import { FieldError } from '@/components/common/forms/FieldError'

import {
  useResendServiceJob,
  useSendServiceJobToVendor,
} from '../../hooks/vendor-jobs/useServiceJobs'
import { useServiceVendors } from '../../hooks/vendor-jobs/useServiceVendors'
import {
  resendVendorJobSchema,
  sendVendorJobSchema,
  type ResendVendorJobInput,
  type SendVendorJobInput,
} from '../../schemas'
import type { ServiceSection, VendorJobSummary } from '../../api/service-jobs'
import { VENDOR_JOB_DIALOG_STRINGS as S } from './vendor-job-dialogs.strings'
import { SendJobNoteField, SendJobVendorField } from './SendVendorJobFields'

interface SendVendorJobDialogProps {
  deviceId: string
  job: VendorJobSummary | null
  section: ServiceSection
  mode: 'send' | 'resend'
  onClose: () => void
}

export function SendVendorJobDialog({
  deviceId,
  job,
  section,
  mode,
  onClose,
}: SendVendorJobDialogProps) {
  const open = job !== null
  const send = useSendServiceJobToVendor()
  const resend = useResendServiceJob()
  const busy = send.isPending || resend.isPending

  const [submitError, setSubmitError] = useState<string | null>(null)

  // Explicit defaults so `reset()` on close actually CLEARS the fields — without
  // them RHF's reset has no baseline for `notes`/`service_vendor_id`, so the last
  // request's instructions leaked into the next one (CP-362 #2).
  const sendForm = useForm<SendVendorJobInput>({
    resolver: zodResolver(sendVendorJobSchema),
    defaultValues: { service_vendor_id: '', notes: '' },
  })
  const resendForm = useForm<ResendVendorJobInput>({
    resolver: zodResolver(resendVendorJobSchema),
    defaultValues: { note: '' },
  })

  // Preselect the section's default vendor on Send. Same query as the picker
  // (shared cache, no extra fetch); not marked dirty, so closing stays prompt-free.
  const { data: vendors = [] } = useServiceVendors(section.code, false, { enabled: open })
  const defaultVendorId = vendors.find((v) => v.is_default)?.id
  useEffect(() => {
    if (open && mode === 'send' && defaultVendorId && !sendForm.getValues('service_vendor_id')) {
      sendForm.setValue('service_vendor_id', defaultVendorId)
    }
  }, [open, mode, defaultVendorId, sendForm])

  const close = () => {
    sendForm.reset()
    resendForm.reset()
    // The dialog stays mounted between jobs, so a failed send's error would
    // otherwise greet the next job's Send.
    setSubmitError(null)
    onClose()
  }

  const submitSend = sendForm.handleSubmit(async (values) => {
    if (!job) return
    setSubmitError(null)
    try {
      await send.mutateAsync({
        deviceId,
        jobId: job.id,
        body: { service_vendor_id: values.service_vendor_id, notes: values.notes || null },
      })
      close()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
    }
  })

  const submitResend = resendForm.handleSubmit(async (values) => {
    if (!job) return
    setSubmitError(null)
    try {
      await resend.mutateAsync({
        deviceId,
        jobId: job.id,
      // Omitted vendor means "same as before" — the server falls back to the
      // source job's vendor.
      body: { service_vendor_id: values.service_vendor_id || null, note: values.note },
      })
      close()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
    }
  })

  const isResend = mode === 'resend'
  const copy = isResend ? S.resend : S.send
  const dirty = isResend ? resendForm.formState.isDirty : sendForm.formState.isDirty

  return (
    <OperationDialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={copy.title}
      description={copy.description}
      isDirty={dirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={busy}>
            {S.common.close}
          </Button>
          <Button onClick={isResend ? submitResend : submitSend} disabled={busy}>
            {busy && (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            )}
            {busy ? S.common.saving : copy.submit}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <SendJobVendorField
          isResend={isResend}
          sendForm={sendForm}
          resendForm={resendForm}
          sectionCode={section.code}
          open={open}
        />

        <FieldError message={submitError} />

        <SendJobNoteField isResend={isResend} sendForm={sendForm} resendForm={resendForm} />
      </div>
    </OperationDialog>
  )
}