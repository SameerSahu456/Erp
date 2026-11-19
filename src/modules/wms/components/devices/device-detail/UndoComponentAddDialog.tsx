import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/components/common/forms/FieldError'
import type { StockItemComponent } from '@modules/ims'

import { OperationDialog } from '../../shared/OperationDialog'
import { useUndoComponentAdd } from '../../../hooks/devices/useDeviceContents'
import { COMPONENTS_CARD_STRINGS as S } from './components-card.strings'

const REASON_MAX = 2000

/** A part added to this device by hand was never really inside it. Undoing the
 *  add returns a picked unit to stock, or withdraws a unit the add created; the
 *  reason is the record of the mistake. */
export function UndoComponentAddDialog({
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
  const undoAdd = useUndoComponentAdd()

  const close = () => {
    setReason('')
    setError(null)
    onClose()
  }

  const submit = async () => {
    const trimmed = reason.trim()
    if (!component || !trimmed) {
      setError(S.undoAdd.reasonRequired)
      return
    }
    try {
      await undoAdd.mutateAsync({
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
      title={S.undoAdd.title}
      description={S.undoAdd.description}
      isDirty={reason !== ''}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose}>
            {S.undoAdd.keep}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void submit()}
            disabled={undoAdd.isPending}
          >
            {undoAdd.isPending ? S.undoAdd.saving : S.undoAdd.submit}
          </Button>
        </>
      )}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="component-undo-add-reason" required>
          {S.undoAdd.reasonLabel}
        </Label>
        <Textarea
          id="component-undo-add-reason"
          rows={3}
          maxLength={REASON_MAX}
          value={reason}
          placeholder={S.undoAdd.reasonPlaceholder}
          aria-invalid={error !== null}
          aria-describedby={error ? 'component-undo-add-reason-error' : undefined}
          onChange={(e) => {
            setReason(e.target.value)
            setError(null)
          }}
        />
        <FieldError id="component-undo-add-reason-error" message={error} />
      </div>
    </OperationDialog>
  )
}
