import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AsyncSelect } from '@/components/ui/async-select'
import { UnsavedChangesDialog } from '@/components/common/dialogs/UnsavedChangesDialog'
import { useVariantsListInfinite, partOptionDescription } from '@modules/ims'

import {
  spareVariantLabel,
  useRaiseSpares,
  type RaiseSparesStage,
} from '../../hooks/operations/useRaiseSpares'
import { OperationDialog } from '../shared/OperationDialog'
import { RAISE_SPARES_DIALOG_STRINGS as S } from './raise-spares-dialog.strings'
import { RaisedSpareLines } from './RaisedSpareLines'
import { StageCompleteFooter } from './StageCompleteFooter'

interface RaiseSparesDialogProps {
  /** Device the spares are for; null = closed. */
  deviceId: string | null
  /** Which active op the request is raised against (for source_operation_id). */
  stage: RaiseSparesStage
  onClose: () => void
}

// Thin adapter so AsyncSelect gets the exact (search, {enabled}) signature.
function useSpareVariantOptions(search: string, options?: { enabled?: boolean }) {
  return useVariantsListInfinite(search, options)
}

/** Raise spare requests during inspection / repair / QC, tied to the device's active op. */
export function RaiseSparesDialog({ deviceId, stage, onClose }: RaiseSparesDialogProps) {
  const r = useRaiseSpares(deviceId, stage, onClose)
  const pending = r.create.isPending

  return (
    <>
      <OperationDialog
        open={r.open}
        onOpenChange={(o) => {
          if (!o) r.guard.requestClose()
        }}
        title={S.title}
        bodyClassName="space-y-4"
        footer={
          <StageCompleteFooter
            cancelLabel={S.cancel}
            submitLabel={pending ? S.requesting : S.requestButton(r.lines.length)}
            onCancel={r.guard.requestClose}
            onSubmit={r.submit}
            disabled={!r.ready || pending}
            pending={pending}
            blockReason={r.blockReason}
          />
        }
      >
        <div className="space-y-1.5">
          <Label>{S.addSparePart}</Label>
          <AsyncSelect
            value={r.picker}
            onValueChange={r.setPicker}
            useOptions={useSpareVariantOptions}
            toLabel={spareVariantLabel}
            getDescription={partOptionDescription}
            onItemPick={r.addVariant}
            searchable
            loadOnOpen
            placeholder={S.pickerPlaceholder}
            searchPlaceholder={S.pickerSearchPlaceholder}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="raise-spares-describe">{S.describePart}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="raise-spares-describe"
              value={r.describing}
              maxLength={S.describeMaxLength}
              placeholder={S.describePlaceholder}
              className="min-w-0 flex-1"
              onChange={(e) => r.setDescribing(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  r.addDescription()
                }
              }}
            />
            <Button variant="outline" className="shrink-0" onClick={r.addDescription} disabled={!r.describedPart}>
              <Plus className="size-4" data-icon="inline-start" />
              {S.addDescribed}
            </Button>
          </div>
        </div>

        <RaisedSpareLines
          lines={r.lines}
          onQuantityChange={(key, quantity) => r.patch(key, { quantity })}
          onRemove={r.removeLine}
        />
      </OperationDialog>
      <UnsavedChangesDialog
        open={r.guard.confirmOpen}
        onOpenChange={r.guard.setConfirmOpen}
        onConfirm={r.guard.confirmDiscard}
        description={S.discardDialog.description}
        discardLabel={S.discardDialog.discardLabel}
      />
    </>
  )
}
