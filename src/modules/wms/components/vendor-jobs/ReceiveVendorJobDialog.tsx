/**
 * Receive an item back from a vendor.
 *
 * TWO orthogonal questions (spec D7): acceptance (`outcome`) and identity
 * (`return_disposition`). The identity half appears only when the section
 * tracks replacement — paint gets one question, display and battery get two.
 */
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Typography } from '@/components/ui/typography'
import { OperationDialog } from '../shared/OperationDialog'
import { FieldError } from '@/components/common/forms/FieldError'

import { useReceiveServiceJob } from '../../hooks/vendor-jobs/useServiceJobs'
import { receiveVendorJobSchema, type ReceiveVendorJobInput } from '../../schemas'
import type { ServiceSection, VendorJobSummary } from '../../api/service-jobs'

import { VENDOR_JOB_DIALOG_STRINGS as S } from './vendor-job-dialogs.strings'

interface ReceiveVendorJobDialogProps {
  deviceId: string
  job: VendorJobSummary | null
  section: ServiceSection
  onClose: () => void
}

export function ReceiveVendorJobDialog({
  deviceId,
  job,
  section,
  onClose,
}: ReceiveVendorJobDialogProps) {
  const open = job !== null
  const receive = useReceiveServiceJob()

  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<ReceiveVendorJobInput>({
    resolver: zodResolver(receiveVendorJobSchema),
    // No pre-selected outcome — the operator must choose, so an accept is never
    // submitted without a decision (§9). Every other field is listed so
    // form.reset() on close actually clears it; fields absent from
    // defaultValues are NOT reset, which leaked one job's vendor_response into
    // the next Receive (CP-177 #34).
    defaultValues: {
      outcome: undefined,
      return_disposition: undefined,
      replacement_serial_no: "",
      vendor_response: "",
    },
  })

  const close = () => {
    form.reset()
    onClose()
  }

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
    if (!job) return
    await receive.mutateAsync({
      deviceId,
      jobId: job.id,
      body: {
        outcome: values.outcome,
        // "" is the unselected <select>; the API wants null.
        return_disposition: values.return_disposition || null,
        replacement_serial_no: values.replacement_serial_no || null,
        vendor_response: values.vendor_response || null,
      },
    })
      close()
    } catch (err) {
      // Without this the rejection is an "Uncaught (in promise) ApiError" in
      // the console and NOTHING on screen — the user sees a dialog that will
      // not close and no reason why.
      setSubmitError(err instanceof Error ? err.message : String(err))
    }
  })

  // The serial field appears only for 'replaced' — the schema enforces it too,
  // so the operator is stopped before the request rather than by a 422.
  const replaced = useWatch({ control: form.control, name: 'return_disposition' }) === 'replaced'
  const dirty = form.formState.isDirty

  return (
    <OperationDialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={S.receive.title}
      description={S.receive.description}
      isDirty={dirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={receive.isPending}>
            {S.common.close}
          </Button>
          <Button onClick={submit} disabled={receive.isPending}>
            {receive.isPending && (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            )}
            {receive.isPending ? S.common.saving : S.receive.submit}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="outcome">{S.receive.outcomeLabel}</Label>
          <Controller
            control={form.control}
            name="outcome"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger id="outcome" className="w-full">
                  <SelectValue placeholder={S.receive.outcomePlaceholder}>
                    {field.value === 'fail'
                      ? S.receive.outcomeFail
                      : field.value === 'pass'
                        ? S.receive.outcomePass
                        : S.receive.outcomePlaceholder}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">{S.receive.outcomePass}</SelectItem>
                  <SelectItem value="fail">{S.receive.outcomeFail}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={form.formState.errors.outcome?.message} />
        </div>

        {section.tracks_replacement && (
          <div className="space-y-1">
            <Label htmlFor="return_disposition">{S.receive.dispositionLabel}</Label>
            <Controller
              control={form.control}
              name="return_disposition"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger id="return_disposition" className="w-full">
                    <SelectValue placeholder={S.receive.dispositionPlaceholder}>
                      {field.value === 'replaced'
                        ? S.receive.dispositionReplaced
                        : field.value === 'repaired'
                          ? S.receive.dispositionRepaired
                          : S.receive.dispositionPlaceholder}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="repaired">{S.receive.dispositionRepaired}</SelectItem>
                    <SelectItem value="replaced">{S.receive.dispositionReplaced}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={form.formState.errors.return_disposition?.message} />
          </div>
        )}

        {replaced && (
          <div className="space-y-1">
            <Label htmlFor="replacement_serial_no" required>
              {S.receive.replacementSerialLabel}
            </Label>
            <Input
              id="replacement_serial_no"
              placeholder={S.receive.replacementSerialPlaceholder}
              {...form.register('replacement_serial_no')}
            />
            <Typography variant="helper" tone="muted">
              {S.receive.replacementSerialHelp}
            </Typography>
            <FieldError message={form.formState.errors.replacement_serial_no?.message} />
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="vendor_response">{S.receive.responseLabel}</Label>
          <Textarea
            id="vendor_response"
            rows={3}
            placeholder={S.receive.responsePlaceholder}
            {...form.register('vendor_response')}
          />
        </div>

        <FieldError message={submitError} />
      </div>
    </OperationDialog>
  )
}
