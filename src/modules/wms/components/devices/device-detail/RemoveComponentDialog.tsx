import { Button } from '@/components/ui/button'
import type { StockItemComponent } from '@modules/ims'

import { ChoiceCard } from '../../shared/ChoiceCard'
import { OperationDialog } from '../../shared/OperationDialog'
import { COMPONENTS_CARD_STRINGS as S } from './components-card.strings'

/** Asked only when a part can both be pulled out and have its add undone:
 *  "it was inside, take it out" vs "it was never inside". Each choice hands
 *  over to its own dialog. */
export function RemoveComponentDialog({
  component,
  onPull,
  onUndoAdd,
  onClose,
}: {
  component: StockItemComponent | null
  onPull: (c: StockItemComponent) => void
  onUndoAdd: (c: StockItemComponent) => void
  onClose: () => void
}) {
  const pick = (next: (c: StockItemComponent) => void) => () => {
    if (component) next(component)
    onClose()
  }
  return (
    <OperationDialog
      open={component !== null}
      onOpenChange={(next) => !next && onClose()}
      title={S.remove.title}
      description={S.remove.description}
      isDirty={false}
      footer={({ requestClose }) => (
        <Button variant="outline" onClick={requestClose}>
          {S.remove.cancel}
        </Button>
      )}
    >
      <div className="grid gap-2">
        <ChoiceCard
          selected={false}
          onClick={pick(onPull)}
          title={S.remove.pullTitle}
          subtitle={S.remove.pullHelp}
        />
        <ChoiceCard
          selected={false}
          onClick={pick(onUndoAdd)}
          title={S.remove.undoTitle}
          subtitle={S.remove.undoHelp}
        />
      </div>
    </OperationDialog>
  )
}
