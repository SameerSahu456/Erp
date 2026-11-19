import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import { makeStaticAsyncOptions, type AsyncSelectOption } from '@/components/ui/async-select'
import { applyServerFieldErrors } from '@shared/api/server-field-errors'

import { useCreateServiceVendor, usePatchServiceVendor } from './useServiceVendors'
import { useServiceSections } from './useServiceSections'
import type { ServiceVendor } from '../../api/service-jobs'
import { SERVICE_VENDOR_DIALOG_STRINGS as S } from '../../components/vendor-jobs/service-vendor-dialog.strings'

export interface ServiceVendorFormValues {
  section_id: string
  // '' is the create-form placeholder state — a required rule forces a choice.
  vendor_type: 'internal' | 'external' | ''
  is_default: boolean
  is_active: boolean
  notes: string
}

interface ServiceVendorFormArgs {
  open: boolean
  editing: ServiceVendor | null
  onClose: () => void
}

function initialVendor(editing: ServiceVendor | null): AsyncSelectOption | null {
  return editing ? { id: editing.vendor_id, label: editing.vendor_name ?? editing.vendor_id } : null
}

function defaultFormValues(editing: ServiceVendor | null): ServiceVendorFormValues {
  return {
    section_id: editing?.section_id ?? '',
    // Create starts unselected (placeholder) — it is NOT preselected External.
    vendor_type: editing ? (editing.vendor_type as 'internal' | 'external') : '',
    is_default: editing?.is_default ?? false,
    is_active: editing?.is_active ?? true,
    notes: editing?.notes ?? '',
  }
}

/** Service-vendor dialog state: section list, vendor pick, RHF form and create/patch submit. */
export function useServiceVendorForm({ open, editing, onClose }: ServiceVendorFormArgs) {
  const isEdit = editing !== null
  // Only fetch the section list once the dialog is open — the closed dialog is
  // still mounted behind the page, so an ungated fetch would run on page load.
  const { data: sections = [] } = useServiceSections({ enabled: open })
  const create = useCreateServiceVendor()
  const patch = usePatchServiceVendor()
  const busy = create.isPending || patch.isPending
  // Section list as searchable AsyncSelect options (§3.2 / §16.11) — the shared
  // picker, adapting the already-fetched array with no extra round-trip.
  const useSectionOptions = useMemo(
    () => makeStaticAsyncOptions(sections, (s) => s.name),
    [sections],
  )

  // Initialised from props: the call site keys the dialog per target, so it
  // REMOUNTS instead of syncing state in an effect.
  const [vendor, setVendor] = useState<AsyncSelectOption | null>(initialVendor(editing))
  const [vendorError, setVendorError] = useState<string | null>(null)
  // One common message shown when a blocked submit leaves required fields empty,
  // alongside the per-field red outline + message.
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<ServiceVendorFormValues>({
    // Surface required-field errors on blur, not only after a failed submit.
    mode: 'onBlur',
    defaultValues: defaultFormValues(editing),
  })
  const sectionInvalid = !!form.formState.errors.section_id
  const typeInvalid = !!form.formState.errors.vendor_type

  // Dirty when any RHF field changed OR (create) a vendor has been picked.
  const dirty =
    form.formState.isDirty || (vendor?.id ?? '') !== (editing?.vendor_id ?? '')

  const close = () => {
    form.reset()
    setVendor(null)
    setVendorError(null)
    setFormError(null)
    onClose()
  }

  const onValid = async (values: ServiceVendorFormValues) => {
    // The vendor isn't an RHF field, so re-check it here (submit() already set
    // the error) before hitting the API.
    if (!vendor) {
      setVendorError(S.vendorRequired)
      setFormError(S.fixRequired)
      return
    }
    // The required rule blocks an empty type at submit; this guard also narrows
    // the union for the API payload below.
    if (!values.vendor_type) {
      setFormError(S.fixRequired)
      return
    }
    try {
      if (isEdit) {
        await patch.mutateAsync({
          id: editing.id,
          body: {
            // Send vendor_id only on a re-pair, so everyday edits still work
            // against a backend that hasn't learned the field yet.
            ...(vendor.id !== editing.vendor_id ? { vendor_id: vendor.id } : {}),
            vendor_type: values.vendor_type,
            is_default: values.is_default,
            is_active: values.is_active,
            notes: values.notes || null,
          },
        })
        close()
        return
      }
      await create.mutateAsync({
        section_id: values.section_id,
        vendor_id: vendor.id,
        vendor_type: values.vendor_type,
        is_default: values.is_default,
        notes: values.notes || null,
      })
      close()
    } catch (err) {
      // Field errors go inline; others were already toasted. Stay open to retry.
      applyServerFieldErrors(err, form.setError)
    }
  }

  // Validate the vendor (not an RHF field) alongside RHF's rules so a blocked
  // submit ALWAYS surfaces feedback, even when the section is empty too.
  const submit = () => {
    setFormError(null)
    if (!vendor) setVendorError(S.vendorRequired)
    void form.handleSubmit(onValid, () => setFormError(S.fixRequired))()
  }

  const pickVendor = (next: AsyncSelectOption | null) => {
    setVendor(next)
    setVendorError(null)
    setFormError(null)
  }

  return {
    isEdit,
    sections,
    busy,
    useSectionOptions,
    vendor,
    pickVendor,
    vendorError,
    formError,
    form,
    sectionInvalid,
    typeInvalid,
    dirty,
    close,
    submit,
  }
}
