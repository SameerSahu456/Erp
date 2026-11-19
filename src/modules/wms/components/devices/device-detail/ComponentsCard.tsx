import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { Cpu, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { EmptyState } from '@/components/common/feedback/EmptyState'
import { ConfirmDialog } from '@/components/common/dialogs/ConfirmDialog'
import { usePermission } from '@shared/rbac'
import { useStockItemComponents, type StockItemComponent } from '@modules/ims'

import { wmsPermissions } from '../../../permissions'
import { DEVICE_STATUS_LABELS } from '../deviceLabels'
import { isDeviceAway, isDueForCheck, isMarkedMissing } from '../../../constants/component-check-state'
import { useWmsStageAccess } from '../../../hooks/operations/useStageAccess'
import { useComponentCaption } from '../../../hooks/devices/useComponentCaption'
import {
  useConfirmDeviceComponent,
  useMarkDeviceComponentFound,
  usePutBackPulledComponent,
} from '../../../hooks/devices/useDeviceContents'
import { AddComponentDialog } from './AddComponentDialog'
import { ComponentRow, type ComponentRowActions, type RemoveOptions } from './ComponentRow'
import { ComponentsDueBanner } from './ComponentsDueBanner'
import { InnerComponentRows } from './InnerComponentRows'
import { withInner } from './component-tree'
import { IdentifyComponentDialog } from './IdentifyComponentDialog'
import { MarkComponentMissingDialog } from './MarkComponentMissingDialog'
import { PullComponentDialog } from './PullComponentDialog'
import { RemoveComponentDialog } from './RemoveComponentDialog'
import { UndoComponentAddDialog } from './UndoComponentAddDialog'
import { COMPONENTS_CARD_STRINGS as S } from './components-card.strings'

/** What is physically inside this device (component-tracking D1), and whether
 *  each recorded component is really there — after a PO inward
 *  (inward-verification D1-D7) or a return (dispatch/return D4/D5). Container: owns data, gates and dialogs;
 *  rows are pure presenters. */
export function ComponentsCard({
  deviceId,
  deviceWarehouseId,
  deviceStatus,
}: {
  deviceId: string
  /** Needed by the add dialog to scope the variant picker; a device with no
   *  warehouse cannot host a recorded component. */
  deviceWarehouseId?: string | null
  /** A device that is away (dispatched, issued, at the vendor…) shows its
   *  components read-only; the API refuses changes with DEVICE_NOT_WITH_US. */
  deviceStatus?: string | null
}) {
  const away = isDeviceAway(deviceStatus)
  const access = useComponentsAccess(deviceWarehouseId, deviceStatus)
  const { canMutate, canCheck, canAdd, canIdentify } = access

  const [showRemoved, setShowRemoved] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [pullTarget, setPullTarget] = useState<StockItemComponent | null>(null)
  const [missingTarget, setMissingTarget] = useState<StockItemComponent | null>(null)
  const [identifyTarget, setIdentifyTarget] = useState<StockItemComponent | null>(null)
  const [foundAfterAllTarget, setFoundAfterAllTarget] = useState<StockItemComponent | null>(null)
  const [putBackTarget, setPutBackTarget] = useState<StockItemComponent | null>(null)
  const [undoAddTarget, setUndoAddTarget] = useState<StockItemComponent | null>(null)
  const [removeTarget, setRemoveTarget] = useState<StockItemComponent | null>(null)
  const confirm = useConfirmDeviceComponent()
  const foundAfterAll = useMarkDeviceComponentFound()
  const putBack = usePutBackPulledComponent()

  // Removed rows always load: a component marked missing must stay visible so
  // it can be found after all; the toggle only reveals the other removed ones.
  const query = useStockItemComponents(deviceId, { includeRemoved: true })
  const current = useMemo(() => query.data?.current_components ?? [], [query.data])
  const removed = useMemo(() => query.data?.removed_components ?? [], [query.data])
  const missing = useMemo(() => removed.filter(isMarkedMissing), [removed])
  const otherRemoved = useMemo(() => removed.filter((c) => !isMarkedMissing(c)), [removed])
  // Away, nothing can be checked, so nothing is shown as waiting for a check.
  const dueCount = useMemo(() => (away ? 0 : current.filter(isDueForCheck).length), [current, away])

  const allComponents = useMemo(() => [...withInner(current), ...removed], [current, removed])
  const caption = useComponentCaption(allComponents)

  const actions: ComponentRowActions = {
    onPull: canMutate ? setPullTarget : undefined,
    onConfirm: canCheck
      ? (c) => confirm.mutate({ deviceId, componentId: c.id })
      : undefined,
    onMarkMissing: canCheck ? setMissingTarget : undefined,
    onFoundAfterAll: canAdd ? setFoundAfterAllTarget : undefined,
    onIdentify: canIdentify ? setIdentifyTarget : undefined,
    // Undoing a pull or a hand add takes the same authority as making it.
    onPutBack: canMutate ? setPutBackTarget : undefined,
    onUndoAdd: canAdd ? setUndoAddTarget : undefined,
    // One Remove button per row: ask only when both ways off the device apply.
    onRemove: routeRemove(setRemoveTarget, setPullTarget, setUndoAddTarget),
    busy: confirm.isPending || foundAfterAll.isPending || putBack.isPending,
  }
  const rows = (list: StockItemComponent[], isRemoved: boolean) =>
    list.map((c) => (
      <Fragment key={c.id}>
        <ComponentRow component={c} isRemoved={isRemoved} caption={caption(c, isRemoved)} actions={actions} deviceAway={away} />
        {isRemoved ? null : <InnerComponentRows parent={c} caption={caption} deviceAway={away} />}
      </Fragment>
    ))

  return (
    <Card>
      <ComponentsCardHeader
        count={current.length}
        canAdd={canAdd}
        onAdd={() => setAddOpen(true)}
      />

      <CardContent>
        <ComponentsCardContent
          isLoading={query.isLoading}
          isError={query.isError}
          empty={current.length === 0 && removed.length === 0}
        >
          <AwayNote status={deviceStatus} />
          <ComponentsDueBanner deviceId={deviceId} dueCount={dueCount} canCheck={canCheck} />
          {rows(current, false)}
          {rows(missing, true)}
          {showRemoved && otherRemoved.length > 0 ? (
            <div className="mt-4">
              <Typography variant="helper" tone="muted" asChild>
                <p className="mb-1">{S.card.removedHeading}</p>
              </Typography>
              {rows(otherRemoved, true)}
            </div>
          ) : null}
          {otherRemoved.length > 0 ? (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowRemoved((v) => !v)}>
              {showRemoved ? S.card.hideRemoved : S.card.showRemoved}
            </Button>
          ) : null}
        </ComponentsCardContent>
      </CardContent>

      <AddComponentDialog
        open={addOpen}
        deviceId={deviceId}
        deviceWarehouseId={deviceWarehouseId}
        missing={missing}
        onClose={() => setAddOpen(false)}
      />
      <PullComponentDialog
        component={pullTarget}
        deviceId={deviceId}
        deviceWarehouseId={deviceWarehouseId}
        onClose={() => setPullTarget(null)}
      />
      <MarkComponentMissingDialog
        component={missingTarget}
        deviceId={deviceId}
        onClose={() => setMissingTarget(null)}
      />
      <IdentifyComponentDialog
        component={identifyTarget}
        deviceId={deviceId}
        onClose={() => setIdentifyTarget(null)}
      />
      <ConfirmDialog
        open={foundAfterAllTarget !== null}
        onOpenChange={(next) => !next && setFoundAfterAllTarget(null)}
        title={S.foundAfterAll.title}
        description={S.foundAfterAll.description}
        confirmLabel={S.foundAfterAll.confirmLabel}
        onConfirm={() => {
          if (foundAfterAllTarget) {
            foundAfterAll.mutate({ deviceId, componentId: foundAfterAllTarget.id })
          }
          setFoundAfterAllTarget(null)
        }}
      />
      <ConfirmDialog
        open={putBackTarget !== null}
        onOpenChange={(next) => !next && setPutBackTarget(null)}
        title={S.putBack.title}
        description={S.putBack.description}
        confirmLabel={S.putBack.confirmLabel}
        onConfirm={() => {
          if (putBackTarget) {
            putBack.mutate({ deviceId, componentId: putBackTarget.id })
          }
          setPutBackTarget(null)
        }}
      />
      <RemoveComponentDialog
        component={removeTarget}
        onPull={setPullTarget}
        onUndoAdd={setUndoAddTarget}
        onClose={() => setRemoveTarget(null)}
      />
      <UndoComponentAddDialog
        component={undoAddTarget}
        deviceId={deviceId}
        onClose={() => setUndoAddTarget(null)}
      />
    </Card>
  )
}

/** Who may change this device's components. Pull / put back gate on
 *  `wms:inward_manage`; adding, checking and undoing an add follow stage
 *  authority at the device's warehouse (inward-verification D4). Nothing is
 *  allowed while the device is away. */
function useComponentsAccess(warehouseId?: string | null, status?: string | null) {
  const { can } = usePermission()
  const { canStage, canIdentifyComponent } = useWmsStageAccess()
  const away = isDeviceAway(status)
  const canCheck = !away && canStage('device_contents', warehouseId)
  return {
    canMutate: !away && can(wmsPermissions.INWARD_MANAGE),
    canCheck,
    canAdd: canCheck,
    canIdentify: !away && canIdentifyComponent(warehouseId),
  }
}

/** Why the card is read-only: the device is not with us. */
function AwayNote({ status }: { status?: string | null }) {
  if (!isDeviceAway(status)) return null
  return (
    <Typography variant="helper" tone="muted" asChild>
      <p className="mb-2">{S.card.awayNote(DEVICE_STATUS_LABELS[status ?? ''] ?? status ?? '')}</p>
    </Typography>
  )
}

type OpenDialog = (c: StockItemComponent) => void

/** The Remove button opens the chooser only when both pull and undo-add apply;
 *  otherwise it goes straight to the one that does. */
function routeRemove(choose: OpenDialog, pull: OpenDialog, undoAdd: OpenDialog) {
  return (c: StockItemComponent, options: RemoveOptions) => {
    if (options.pull && options.undoAdd) choose(c)
    else if (options.pull) pull(c)
    else undoAdd(c)
  }
}

/** Title, live count and the card-level add trigger. */
function ComponentsCardHeader({
  count,
  canAdd,
  onAdd,
}: {
  count: number
  canAdd: boolean
  onAdd: () => void
}) {
  return (
    <CardHeader className="flex-row items-start justify-between gap-3">
      <div className="min-w-0">
        <CardTitle>{S.card.title}</CardTitle>
        <Typography variant="helper" tone="muted" asChild>
          <p>{S.card.subtitle}</p>
        </Typography>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {count > 0 ? (
          <Typography variant="helper" tone="muted" asChild>
            <span>{S.card.countLabel(count)}</span>
          </Typography>
        ) : null}
        {canAdd ? (
          <Button size="sm" onClick={onAdd}>
            <Plus className="size-3.5" data-icon="inline-start" />
            {S.add.trigger}
          </Button>
        ) : null}
      </div>
    </CardHeader>
  )
}

/** Loading / error / empty split for the card body; `children` is the list. */
function ComponentsCardContent({
  isLoading,
  isError,
  empty,
  children,
}: {
  isLoading: boolean
  isError: boolean
  empty: boolean
  children: ReactNode
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }
  // Distinct from empty on purpose: an error rendered as "nothing here" tells
  // the reader this device has no components (PAGE-UI-RULES §1.1).
  if (isError) {
    return (
      <Typography variant="body" tone="danger" asChild>
        <p>{S.card.error}</p>
      </Typography>
    )
  }
  if (empty) return <EmptyState icon={Cpu} title={S.card.empty} description={S.card.emptyHint} />
  return <>{children}</>
}

