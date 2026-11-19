/**
 * Register a procurement vendor as servicing one section, or edit that pairing.
 *
 * The SECTION anchors the row and stays immutable. The VENDOR is editable: an
 * operator can re-point the pairing to a different vendor within the same
 * section (the (section, vendor) pair stays unique). This deliberately
 * re-attributes the vendor shown against jobs already dispatched under this row.
 * Editing therefore covers vendor, type, default, active and notes.
 */
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { OperationDialog } from '../shared/OperationDialog'
import { FieldError } from '@/components/common/forms/FieldError'

import { useServiceVendorForm } from '../../hooks/vendor-jobs/useServiceVendorForm'
import type { ServiceVendor } from '../../api/service-jobs'

import { SERVICE_VENDOR_DIALOG_STRINGS as S } from './service-vendor-dialog.strings'
import {
  ServiceVendorFlagFields,
  ServiceVendorPairFields,
  ServiceVendorTypeField,
} from './ServiceVendorDialogFields'

interface ServiceVendorDialogProps {
  open: boolean
  /** null = create; a row = edit. */
  editing: ServiceVendor | null
  onClose: () => void
}

export function ServiceVendorDialog({ open, editing, onClose }: ServiceVendorDialogProps) {
  const c = useServiceVendorForm({ open, editing, onClose })
  const { isEdit, busy, dirty, close, submit, formError } = c

  return (
    <OperationDialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={isEdit ? S.editTitle : S.createTitle}
      description={S.description}
      isDirty={dirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={busy}>
            {S.close}
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            )}
            {busy ? S.saving : isEdit ? S.save : S.create}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <ServiceVendorPairFields c={c} />

        <ServiceVendorTypeField c={c} />

        <ServiceVendorFlagFields c={c} />

        <FieldError message={formError} />
      </div>
    </OperationDialog>
  )
}