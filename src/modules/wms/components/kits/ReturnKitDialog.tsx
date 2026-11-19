import { useState } from "react"
import { Package } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"

import type { ReturnKit } from "../../api"
import { useReturnKit, useSaveReturnKit } from "../../hooks/kits/useKits"
import { KitLoadingDialog } from "./KitLoadingDialog"
import { KITS_STRINGS as S } from "./kits.strings"

/** `null` = not answered yet. Nothing is pre-ticked: an operator who saves
 *  without looking must not record every item as fine and charge nothing. */
interface Answer {
  returned: boolean | null
  working: boolean | null
}

function YesNo({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: boolean | null
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <Typography variant="caption" tone="muted">
        {label}
      </Typography>
      {([true, false] as const).map((v) => (
        <Button
          key={String(v)}
          size="xs"
          variant={value === v ? "default" : "outline"}
          aria-pressed={value === v}
          disabled={disabled}
          onClick={() => onChange(v)}
        >
          {v ? S.yes : S.no}
        </Button>
      ))}
    </div>
  )
}

const answered = (a: Answer) => a.returned === false || (a.returned === true && a.working !== null)

function CheckForm({ lineId, kit, onClose }: { lineId: string; kit: ReturnKit; onClose: () => void }) {
  const save = useSaveReturnKit(lineId)
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(kit.items.map((i) => [i.item_key, { returned: i.returned, working: i.working }])),
  )
  const set = (key: string, part: Partial<Answer>) => setAnswers((a) => ({ ...a, [key]: { ...a[key], ...part } }))
  const complete = kit.items.every((i) => answered(answers[i.item_key]))
  const dirty = kit.items.some((i) => answers[i.item_key].returned !== i.returned || answers[i.item_key].working !== i.working)
  // `mutate`, not `mutateAsync`: the hook's onError already toasts.
  const confirm = () =>
    save.mutate(
      kit.items.map((i) => {
        const a = answers[i.item_key]
        // An item that did not come back cannot be judged working.
        return { item_key: i.item_key, returned: a.returned === true, working: a.returned ? a.working : null }
      }),
      { onSuccess: onClose },
    )
  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={S.returnTitle}
      description={S.returnBody}
      isDirty={dirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={save.isPending}>
            {S.cancel}
          </Button>
          <Button onClick={confirm} disabled={kit.items.length === 0 || !complete || save.isPending}>
            {S.save}
          </Button>
        </>
      )}
    >
      <div className="space-y-3">
        {kit.no_dispatch_record && (
          <Typography variant="helper" tone="muted">
            {S.noDispatchRecord}
          </Typography>
        )}
        {kit.items.length === 0 ? (
          <Typography variant="body" tone="muted">
            {S.empty}
          </Typography>
        ) : (
          <ul className="divide-y rounded-md border">
            {kit.items.map((i) => {
              const a = answers[i.item_key]
              return (
                <li key={i.item_key} className="flex min-w-0 flex-wrap items-center gap-3 p-2">
                  <Typography variant="body" className="min-w-0 flex-1 truncate">
                    {i.label}
                  </Typography>
                  <YesNo label={S.returned} value={a.returned} onChange={(v) => set(i.item_key, { returned: v })} />
                  <YesNo
                    label={S.working}
                    value={a.returned === false ? null : a.working}
                    disabled={a.returned !== true}
                    onChange={(v) => set(i.item_key, { working: v })}
                  />
                  {i.deficiency_id && <StatusBadge variant="warning">{S.raised}</StatusBadge>}
                </li>
              )
            })}
          </ul>
        )}
        {!complete && kit.items.length > 0 && (
          <Typography variant="helper" tone="muted">
            {S.undecided}
          </Typography>
        )}
      </div>
    </OperationDialog>
  )
}

/** "Kit" on a received rental unit: check off what came back. */
export function ReturnKitButton({ grnLineItemId }: { grnLineItemId: string }) {
  const [open, setOpen] = useState(false)
  const query = useReturnKit(grnLineItemId, open)
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
        <KitLoadingDialog title={S.returnTitle} failed={query.isError} error={query.error} onClose={() => setOpen(false)} />
      )}
      {open && query.data && (
        <CheckForm key={query.dataUpdatedAt} lineId={grnLineItemId} kit={query.data} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
