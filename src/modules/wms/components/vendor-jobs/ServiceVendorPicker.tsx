import { useMemo } from 'react'

import { AsyncSelect, makeStaticAsyncOptions } from '@/components/ui/async-select'
import { formatIndiaPhone } from '@shared/lib/validation'

import { useServiceVendors } from '../../hooks/vendor-jobs/useServiceVendors'
import { VENDOR_JOB_DIALOG_STRINGS as S } from './vendor-job-dialogs.strings'

interface ServiceVendorPickerProps {
  id?: string
  /** The service section whose (active) vendors are listed. No section → no fetch. */
  sectionCode: string | undefined
  /** Extra gate on the vendor fetch (e.g. the dialog is closed). Default true. */
  enabled?: boolean
  /** Selected vendor id ('' = none). */
  value: string | undefined
  onChange: (vendorId: string) => void
  placeholder: string
  /** Optional "none" row — picking it reports ''. */
  allOption?: string
}

/** Picker over a section's active vendors (with contact number). Fetched whole, so
 *  no per-keystroke request. Shared by the vendor-job dialogs. */
export function ServiceVendorPicker({
  id,
  sectionCode,
  enabled = true,
  value,
  onChange,
  placeholder,
  allOption,
}: ServiceVendorPickerProps) {
  const { data: vendors = [] } = useServiceVendors(sectionCode, false, {
    enabled: enabled && !!sectionCode,
  })
  const useVendorOptions = useMemo(
    () => makeStaticAsyncOptions(vendors, (v) => v.vendor_name ?? ''),
    [vendors],
  )
  const selectedName = value ? (vendors.find((v) => v.id === value)?.vendor_name ?? '') : ''

  return (
    <AsyncSelect
      id={id}
      value={value ? { id: value, label: selectedName } : null}
      onValueChange={(opt) => onChange(opt?.id ?? '')}
      useOptions={useVendorOptions}
      toLabel={(v) => v.vendor_name ?? ''}
      renderItem={(v) => (
        <span className="block min-w-0 truncate">
          {S.vendorPicker.option(
            v.vendor_name ?? '',
            v.vendor_contact_number ? formatIndiaPhone(v.vendor_contact_number) : undefined,
          )}
        </span>
      )}
      allOption={allOption}
      placeholder={placeholder}
      clearable={false}
      className="w-full"
    />
  )
}
