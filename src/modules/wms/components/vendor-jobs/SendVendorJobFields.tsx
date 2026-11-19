import { Controller, type UseFormReturn } from 'react-hook-form'

import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { FieldError } from '@/components/common/forms/FieldError'

import type { ResendVendorJobInput, SendVendorJobInput } from '../../schemas'
import { VENDOR_JOB_DIALOG_STRINGS as S } from './vendor-job-dialogs.strings'
import { ServiceVendorPicker } from './ServiceVendorPicker'

interface SendJobFormsProps {
  isResend: boolean
  sendForm: UseFormReturn<SendVendorJobInput>
  resendForm: UseFormReturn<ResendVendorJobInput>
}

/** Vendor picker; on send-again an empty pick means "same vendor as before". */
export function SendJobVendorField({
  isResend,
  sendForm,
  resendForm,
  sectionCode,
  open,
}: SendJobFormsProps & { sectionCode: string; open: boolean }) {
  const copy = isResend ? S.resend : S.send
  return (
    <div className="space-y-1">
      <Label htmlFor="service_vendor_id" required={!isResend}>
        {copy.vendorLabel}
      </Label>
      {isResend ? (
        <Controller
          control={resendForm.control}
          name="service_vendor_id"
          render={({ field }) => (
            // Empty pick = same vendor as before (sentinel maps to '' on submit).
            <ServiceVendorPicker
              id="service_vendor_id"
              sectionCode={sectionCode}
              enabled={open}
              value={field.value}
              onChange={field.onChange}
              allOption={S.resend.vendorSame}
              placeholder={S.resend.vendorSame}
            />
          )}
        />
      ) : (
        <Controller
          control={sendForm.control}
          name="service_vendor_id"
          render={({ field }) => (
            <ServiceVendorPicker
              id="service_vendor_id"
              sectionCode={sectionCode}
              enabled={open}
              value={field.value}
              onChange={field.onChange}
              placeholder={S.send.vendorPlaceholder}
            />
          )}
        />
      )}
      <FieldError
        message={
          isResend
            ? resendForm.formState.errors.service_vendor_id?.message
            : sendForm.formState.errors.service_vendor_id?.message
        }
      />
    </div>
  )
}

/** Send: optional instructions. Send-again: a mandatory note. */
export function SendJobNoteField({ isResend, sendForm, resendForm }: SendJobFormsProps) {
  if (isResend) {
    return (
      <div className="space-y-1">
        <Label htmlFor="note" required>
          {S.resend.noteLabel}
        </Label>
        <Textarea
          id="note"
          rows={3}
          placeholder={S.resend.notePlaceholder}
          {...resendForm.register('note')}
        />
        <Typography variant="helper" tone="muted">
          {S.resend.noteHelp}
        </Typography>
        <FieldError message={resendForm.formState.errors.note?.message} />
      </div>
    )
  }
  return (
    <div className="space-y-1">
      <Label htmlFor="notes">{S.send.notesLabel}</Label>
      <Textarea
        id="notes"
        rows={3}
        placeholder={S.send.notesPlaceholder}
        {...sendForm.register('notes')}
      />
    </div>
  )
}
