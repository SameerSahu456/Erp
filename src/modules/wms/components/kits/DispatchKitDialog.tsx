import { useState } from "react"
import { Package } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Typography } from "@/components/ui/typography"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { usePermission } from "@shared/rbac"

import type { DispatchKitItem } from "../../api"
import { wmsCan } from "../../permissions"
import { useDispatchKit, useSaveDispatchKit } from "../../hooks/kits/useKits"
import { KitLoadingDialog } from "./KitLoadingDialog"
import { KITS_STRINGS as S } from "./kits.strings"

function KitForm({ driId, items, onClose }: { driId: string; items: DispatchKitItem[]; onClose: () => void }) {
  const save = useSaveDispatchKit(driId)
  const [ticks, setTicks] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((i) => [i.part_kit_item_id, i.dispatched === true])),
  )
  const dirty = items.some((i) => ticks[i.part_kit_item_id] !== (i.dispatched === true))
  // `mutate`, not `mutateAsync`: the hook's onError already toasts, and an
  // awaited rejection here would surface as an unhandled promise.
  const confirm = () =>
    save.mutate(
      items.map((i) => ({ part_kit_item_id: i.part_kit_item_id, dispatched: ticks[i.part_kit_item_id] })),
      { onSuccess: onClose },
    )
  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={S.dispatchTitle}
      description={S.dispatchBody}
      isDirty={dirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={save.isPending}>
            {S.cancel}
          </Button>
          <Button onClick={confirm} disabled={items.length === 0 || save.isPending}>
            {S.save}
          </Button>
        </>
      )}
    >
      {items.length === 0 ? (
        <Typography variant="body" tone="muted">
          {S.empty}
        </Typography>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.part_kit_item_id}>
              <label className="flex min-w-0 items-center gap-2">
                <Checkbox
                  checked={ticks[i.part_kit_item_id]}
                  onCheckedChange={(v) => setTicks((t) => ({ ...t, [i.part_kit_item_id]: v === true }))}
                />
                <Typography variant="body" className="min-w-0 truncate">
                  {i.label}
                </Typography>
              </label>
            </li>
          ))}
        </ul>
      )}
    </OperationDialog>
  )
}

/** "Kit" on a dispatched unit: tick what went out with it. Saving needs
 *  wms:outward_manage, so the button is not offered without it. */
export function DispatchKitButton({ driId }: { driId: string }) {
  const { can } = usePermission()
  const [open, setOpen] = useState(false)
  const query = useDispatchKit(driId, open)
  if (!can([...wmsCan.outwardManage])) return null
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
      >
        <Package className="size-4" data-icon="inline-start" />
        {S.open}
      </Button>
      {open && !query.data && (
        <KitLoadingDialog title={S.dispatchTitle} failed={query.isError} error={query.error} onClose={() => setOpen(false)} />
      )}
      {/* Keyed on the fetch so a refetch landing after open re-seeds the ticks. */}
      {open && query.data && (
        <KitForm key={query.dataUpdatedAt} driId={driId} items={query.data} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
