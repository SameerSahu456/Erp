/**
 * Raise a vendor-service request for one item.
 *
 * ONE form for every job type: the operator first picks the job type (service
 * section), and the item suggestions, vendor list and serial requirement then
 * follow the chosen `service_sections` row. When only one section applies it is
 * auto-selected and the picker collapses to a read-only line. There is still no
 * branch on a section code — everything data-driven off the section row.
 *
 * Items are chosen from a multi-select dropdown (the section's suggestions plus
 * an "Others" option). "Others" reveals a free-text box so an item outside the
 * suggestion list can still be raised. Part / serial / instructions fields were
 * dropped from this form — the item line carries what the vendor needs.
 */
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { OperationDialog } from '../shared/OperationDialog'
import { FieldError } from '@/components/common/forms/FieldError'

import type { ServiceSection } from '../../api/service-jobs'
import { useRaiseVendorJob } from '../../hooks/vendor-jobs/useRaiseVendorJob'
import { VENDOR_JOB_DIALOG_STRINGS as S } from './vendor-job-dialogs.strings'
import { RaiseItemFields, RaiseJobTypePicker } from './RaiseVendorJobFields'

interface RaiseVendorJobDialogProps {
  deviceId: string | null
  /** The device's applicable job types. One → auto-selected; many → picker. */
  sections: ServiceSection[]
  onClose: () => void
}

export function RaiseVendorJobDialog({
  deviceId,
  sections,
  onClose,
}: RaiseVendorJobDialogProps) {
  const c = useRaiseVendorJob({ deviceId, sections, onClose })
  const { open, raise, section, multiSection, dirty, submit, close, submitError } = c

  return (
    <OperationDialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={section && !multiSection ? S.raise.title(section.name) : S.raise.titleGeneric}
      description={S.raise.description}
      isDirty={dirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={raise.isPending}>
            {S.common.close}
          </Button>
          <Button onClick={submit} disabled={raise.isPending}>
            {raise.isPending && (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            )}
            {raise.isPending ? S.common.saving : S.raise.submit}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        {/* Job type first. One applicable section auto-selects (no picker);
            many → the operator chooses which job this request is for. */}
        {multiSection && <RaiseJobTypePicker c={c} />}

        {section ? (
          <>
            <RaiseItemFields c={c} />

            {/* No vendor field here — raising is one standard form for every
                role. The job is created Awaiting Vendor; picking the vendor
                happens later in the Send-to-vendor step. */}
          </>
        ) : null}

        <FieldError message={submitError} />
      </div>
    </OperationDialog>
  )
}