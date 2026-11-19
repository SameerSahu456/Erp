import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { makeStaticAsyncOptions } from '@/components/ui/async-select'
import type { AsyncOption } from '@/components/ui/async-multi-select'

import { useRaiseServiceJob } from './useServiceJobs'
import { raiseVendorJobSchema, type RaiseVendorJobInput } from '../../schemas'
import type { ServiceSection } from '../../api/service-jobs'
import { VENDOR_JOB_DIALOG_STRINGS as S } from '../../components/vendor-jobs/vendor-job-dialogs.strings'
import { errMsg } from '../../errorMessage'

// Sentinel id for the "Others" dropdown option (reveals the free-text box).
const OTHERS = '__other__'

interface RaiseVendorJobArgs {
  deviceId: string | null
  sections: ServiceSection[]
  onClose: () => void
}

/** Raise-vendor-job dialog state: job type, picked items, free text and the batch submit. */
export function useRaiseVendorJob({ deviceId, sections, onClose }: RaiseVendorJobArgs) {
  const open = deviceId !== null
  const raise = useRaiseServiceJob()
  // Job-type (section) selection. A single applicable section auto-selects so
  // the operator isn't asked to pick from a list of one.
  const [pickedSectionId, setPickedSectionId] = useState('')
  const section =
    sections.find((s) => s.id === pickedSectionId) ??
    (sections.length === 1 ? sections[0] : undefined)
  const multiSection = sections.length > 1
  // Section-type options for the picker (§16.11 static adapter — no fetch).
  const useSectionOptions = useMemo(
    () => makeStaticAsyncOptions(sections, (s) => s.name),
    [sections],
  )

  // Item dropdown = the section's suggestions + an "Others" escape hatch. Static
  // adapter (no fetch), same idiom as the job-type picker.
  const itemSuggestions = section?.item_suggestions ?? []
  const itemOptions = useMemo(
    () => [
      ...(section?.item_suggestions ?? []).map((s) => ({ id: s, name: s })),
      { id: OTHERS, name: S.raise.othersOption },
    ],
    [section],
  )
  const useItemOptions = useMemo(
    () => makeStaticAsyncOptions(itemOptions, (o) => o.name),
    [itemOptions],
  )

  // Full defaults so `reset()` on close clears EVERY field — the free-text item
  // was leaking the last request's value into the next raise (CP-362 #2).
  const form = useForm<RaiseVendorJobInput>({
    resolver: zodResolver(raiseVendorJobSchema),
    defaultValues: {
      item_description: '',
      service_vendor_id: '',
    },
  })

  // Multi-pick: each picked item becomes its OWN job, so a panel can be sent,
  // chased and received independently of its siblings.
  const [picked, setPicked] = useState<AsyncOption[]>([])

  const close = () => {
    form.reset()
    setPicked([])
    setPickedSectionId('')
    onClose()
  }

  const [submitError, setSubmitError] = useState<string | null>(null)

  // "Others" reveals the free-text box, and its typed value counts as one more
  // item (a section with no suggestions always shows the free-text box).
  const othersSelected = picked.some((o) => o.id === OTHERS)
  const showFreeText = othersSelected || itemSuggestions.length === 0
  const typedItem = (useWatch({ control: form.control, name: 'item_description' }) ?? '').trim()
  const pickedItemIds = picked.filter((o) => o.id !== OTHERS).map((o) => o.id)
  // The items that will actually be raised — picked suggestions plus the typed
  // one (only when the free-text box is shown and non-empty).
  const effectiveItems = [
    ...pickedItemIds,
    ...(showFreeText && typedItem && !pickedItemIds.includes(typedItem) ? [typedItem] : []),
  ]

  // Dirty when any RHF field changed OR an item is picked OR a job type was
  // chosen (all local state RHF can't see), so Cancel / Esc / backdrop route
  // through the discard guard.
  const dirty =
    form.formState.isDirty || picked.length > 0 || (multiSection && !!pickedSectionId)

  const submit = form.handleSubmit(
    async (values) => {
      setSubmitError(null)
      if (!deviceId) return
      if (!section) {
        setSubmitError(S.raise.pickTypeFirst)
        return
      }
      const items = effectiveItems
      if (items.length === 0) {
        setSubmitError(S.raise.noneSelected)
        return
      }
      // Sequential: items share a device. Each success is removed from the form so a
      // retry only raises what is left.
      let raised = 0
      try {
        for (const item of items) {
          await raise.mutateAsync({
            deviceId,
            body: {
              service_section_id: section.id,
              item_description: item,
              // Part / serial / instructions were dropped from this form — the
              // item line is what the vendor and the supervisor read.
              item_part_no: null,
              item_serial_no: null,
              service_vendor_id: values.service_vendor_id || null,
              notes: null,
            },
          })
          raised += 1
          setPicked((prev) => prev.filter((o) => o.id !== item))
          if (item === typedItem) form.setValue('item_description', '')
        }
        // One summary toast for the whole batch — success feedback was missing
        // entirely before (§0.13).
        toast.success(S.raise.raisedToast(items.length))
        close()
      } catch (err) {
        if (raised > 0) toast.success(S.raise.raisedToast(raised))
        setSubmitError(
          raised > 0
            ? S.raise.partialFailure(raised, items.length, errMsg(err))
            : errMsg(err),
        )
      }
    },
    // Name the field instead of a generic "fix the highlighted fields".
    (errors) =>
      setSubmitError(
        errors.item_description
          ? S.raise.itemInvalid(
              itemSuggestions.length > 0 ? S.raise.customLabel : S.raise.itemLabel,
              errors.item_description.message ?? '',
            )
          : S.common.fixErrors,
      ),
  )

  const sectionName = (id: string | undefined) =>
    id ? (sections.find((s) => s.id === id)?.name ?? '') : ''

  const changeSection = (next: string) => {
    // Switching the job means a fresh request: the old section's items, free
    // text and vendor must not ride along (CP-467).
    if (next !== pickedSectionId) {
      setPicked([])
      form.reset({ item_description: '', service_vendor_id: '' })
    }
    setPickedSectionId(next)
  }

  return {
    open,
    raise,
    section,
    multiSection,
    pickedSectionId,
    useSectionOptions,
    itemSuggestions,
    useItemOptions,
    form,
    picked,
    setPicked,
    close,
    submitError,
    showFreeText,
    effectiveItems,
    dirty,
    submit,
    sectionName,
    changeSection,
  }
}
