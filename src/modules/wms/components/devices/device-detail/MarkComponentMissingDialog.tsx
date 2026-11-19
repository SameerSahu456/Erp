import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/components/common/forms/FieldError'
import type { StockItemComponent } from '@modules/ims'

import { OperationDialog } from '../../shared/OperationDialog'
import { useMarkDeviceComponentMissing } from '../../../hooks/devices/useDeviceContents'
import { isDueForCheck, VERIFICATION_REASON_INWARD } from '../../../constants/component-check-state'
import { COMPONENTS_CARD_STRINGS as S } from './components-card.strings'

const REASON_MAX = 2000

/** A component recorded inside the device is not there (D4; inward D6). Its unit
 *  leaves held stock (the customer kept it, or it never arrived), so the reason
 *  is the record of what was seen. */
export function MarkComponentMissingDialog({
  component,
  deviceId,
  onClose,
}: {
  component: StockItemComponent | null
  deviceId: string
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const markMissing = useMarkDeviceComponentMissing()

  const close = () => {
    setReason('')
    setError(null)
    onClose()
  }

  const submit = async () => {
    const trimmed = reason.trim()
    if (!component || !trimmed) {
      setError(S.missing.reasonRequired)
      return
    }
    try {
      await markMissing.mutateAsync({
        deviceId,
        componentId: component.id,
        body: { reason: trimmed },
      })
      close()
    } catch {
      // The hook toasts the typed error; keep the reason so it is not retyped.
    }
  }

  return (
    <OperationDialog
      open={component !== null}
      onOpenChange={(next) => !next && close()}
      title={S.missing.title}
      description={missingDescription(component)}
      isDirty={reason !== ''}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose}>
            {S.missing.keep}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void submit()}
            disabled={markMissing.isPending}
          >
            {markMissing.isPending ? S.missing.saving : S.missing.submit}
          </Button>
        </>
      )}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="component-missing-reason" required>
          {S.missing.reasonLabel}
        </Label>
        <Textarea
          id="component-missing-reason"
          rows={3}
          maxLength={REASON_MAX}
          value={reason}
          placeholder={S.missing.reasonPlaceholder}
          aria-invalid={error !== null}
          aria-describedby={error ? 'component-missing-reason-error' : undefined}
          onChange={(e) => {
            setReason(e.target.value)
            setError(null)
          }}
        />
        <FieldError id="component-missing-reason-error" message={error} />
      </div>
    </OperationDialog>
  )
}

/** What "missing" means for this part: while it waits to be checked, why it was
 *  due decides (inward D6); any other time it simply is not in the device. */
function missingDescription(component: StockItemComponent | null): string {
  if (!component || !isDueForCheck(component)) return S.missing.descriptionNotInDevice
  return component.verification_reason === VERIFICATION_REASON_INWARD
    ? S.missing.descriptionInward
    : S.missing.description
}
