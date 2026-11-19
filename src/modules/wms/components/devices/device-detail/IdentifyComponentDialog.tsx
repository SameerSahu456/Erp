import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AsyncSelect } from '@/components/ui/async-select'
import { FieldError } from '@/components/common/forms/FieldError'
import {
  useVariantsListInfinite,
  type StockItemComponent,
  type VariantListItem, partOptionDescription } from '@modules/ims'

import { OperationDialog } from '../../shared/OperationDialog'
import { useIdentifyDeviceComponent } from '../../../hooks/devices/useDeviceContents'
import { COMPONENTS_CARD_STRINGS as S } from './components-card.strings'

/** Link a described component to its IMS part (spec D5) — a store decision.
 *  Only then does it become a counted stock unit inside the device. */
export function IdentifyComponentDialog({
  component,
  deviceId,
  onClose,
}: {
  component: StockItemComponent | null
  deviceId: string
  onClose: () => void
}) {
  const [part, setPart] = useState<{ id: string; label: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const identify = useIdentifyDeviceComponent()

  const close = () => {
    setPart(null)
    setError(null)
    onClose()
  }

  const submit = async () => {
    if (!component || !part) {
      setError(S.identify.partRequired)
      return
    }
    try {
      await identify.mutateAsync({
        deviceId,
        componentId: component.id,
        body: { part_variant_id: part.id },
      })
      close()
    } catch {
      // The hook toasts the typed error; keep the pick for a retry.
    }
  }

  return (
    <OperationDialog
      open={component !== null}
      onOpenChange={(next) => !next && close()}
      title={S.identify.title}
      description={S.identify.description(component?.description ?? component?.part_name ?? '')}
      isDirty={part !== null}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose}>
            {S.identify.cancel}
          </Button>
          <Button onClick={() => void submit()} disabled={identify.isPending}>
            {identify.isPending ? S.identify.saving : S.identify.submit}
          </Button>
        </>
      )}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="identify-part" required>
          {S.identify.partLabel}
        </Label>
        <AsyncSelect<VariantListItem>
          id="identify-part"
          className="sm:max-w-md"
          value={part}
          onValueChange={(opt) => {
            setPart(opt ? { id: opt.id, label: opt.label } : null)
            setError(null)
          }}
          useOptions={useVariantsListInfinite}
          toLabel={(v) => v.display_title || `${v.part_number} · ${v.name}`}
          getDescription={partOptionDescription}
          placeholder={S.identify.partPlaceholder}
          searchPlaceholder={S.identify.partPlaceholder}
          clearable
          chevron="down"
        />
        <FieldError message={error} />
      </div>
    </OperationDialog>
  )
}
