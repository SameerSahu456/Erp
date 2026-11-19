import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { applyServerFieldErrors } from '@shared/api/server-field-errors'

import type { ServiceSection } from '../../api/service-jobs'
import { serviceSectionFormSchema, type ServiceSectionFormInput } from '../../schemas'
import { SERVICE_SECTIONS_STRINGS as S } from '../../components/vendor-jobs/service-sections.strings'
import { useCreateServiceSection, usePatchServiceSection } from './useServiceSections'

function sectionDefaults(editing: ServiceSection | null): ServiceSectionFormInput {
  return {
    code: editing?.code ?? '',
    name: editing?.name ?? '',
    device_status_label: editing?.device_status_label ?? '',
    item_suggestions: editing?.item_suggestions ?? [],
    tracks_replacement: editing?.tracks_replacement ?? false,
    applies_to_servers: editing?.applies_to_servers ?? true,
    is_active: editing?.is_active ?? true,
  }
}

/** Service-section dialog state (§17); keyed per target, so no syncing effect. */
export function useServiceSectionForm(editing: ServiceSection | null, onClose: () => void) {
  const isEdit = editing !== null
  const create = useCreateServiceSection()
  const patch = usePatchServiceSection()
  // One common message when a blocked submit leaves required fields empty,
  // alongside each field's red outline + message.
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<ServiceSectionFormInput>({
    // Rules (incl. the reserved route codes) live in the Zod schema (§9).
    resolver: zodResolver(serviceSectionFormSchema(isEdit)),
    // Surface required-field errors on blur, not only after a failed submit.
    mode: 'onBlur',
    defaultValues: sectionDefaults(editing),
  })

  const close = () => {
    form.reset()
    setFormError(null)
    onClose()
  }

  const onValid = async (values: ServiceSectionFormInput) => {
    const common = {
      name: values.name,
      device_status_label: values.device_status_label,
      item_suggestions: values.item_suggestions.map((s) => s.trim()).filter(Boolean),
      tracks_replacement: values.tracks_replacement,
      applies_to_servers: values.applies_to_servers,
    }
    try {
      if (editing) await patch.mutateAsync({ id: editing.id, body: { ...common, is_active: values.is_active } })
      else await create.mutateAsync({ ...common, code: values.code })
      close()
    } catch (err) {
      // Field errors go inline; others were already toasted. Stay open to retry.
      applyServerFieldErrors(err, form.setError)
    }
  }

  return {
    form,
    isEdit,
    busy: create.isPending || patch.isPending,
    formError,
    close,
    submit: () => {
      setFormError(null)
      void form.handleSubmit(onValid, () => setFormError(S.dialog.fixRequired))()
    },
  }
}
