import * as React from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  AsyncMultiSelect,
  type AsyncOption,
} from "@/components/ui/async-multi-select"

import type { AccountListItem, AccountTypeWire } from "../../api"
import {
  useAccountOptions,
  useSyncChildAccounts,
} from "../../hooks/accounts/useAccounts"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"

interface LinkChildAccountsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The account we're linking children to — drives the server-side
   *  `eligibleChildFor` filter (excludes itself + its ancestor chain). */
  accountId: string
  /** Current child-account count (the `total` from the children list API).
   *  Shown live in the dialog and adjusted by pending ticks/unticks. */
  currentChildTotal?: number
  /** This account's type. When set, the child picker only lists accounts of the
   *  same type (a child must share the parent's account type). */
  accountType?: AccountTypeWire
}

// Manage-children modal. A multi-select dropdown (AsyncMultiSelect over
// GET /crm/accounts?eligible_child_for=<accountId> — debounced server search +
// infinite scroll, §16.11) that lists cycle-safe candidates AND this account's
// current children in one stream (children aren't ancestors, so they pass the
// filter; each row carries `parent_account_id` to tell them apart).
//
// Delta model — we never pre-fetch the whole child list. As option pages stream
// in (`onItemsLoaded`), rows that are already children (`parent_account_id ===
// accountId`) auto-check, seeded once each so a later page can't undo a manual
// untick. Save sends only what the user actually changed:
//   • a ticked NON-child  → toAdd   (link)
//   • an unticked child   → toRemove (unlink)
// Children the user never scrolls to are left untouched (never in toRemove).
export function LinkChildAccountsDialog({
  open,
  onOpenChange,
  accountId,
  currentChildTotal = 0,
  accountType,
}: LinkChildAccountsDialogProps) {
  const [selected, setSelected] = React.useState<AsyncOption[]>([])
  const syncMut = useSyncChildAccounts(accountId)

  // Every option row seen so far (across pages/searches) — the source of truth
  // for "is this candidate already a child?" without a full-children fetch.
  const loadedByIdRef = React.useRef(new Map<string, AccountListItem>())
  // Children auto-seeded into `selected` already — so reloading a page never
  // re-checks a child the user has since unticked.
  const seededRef = React.useRef(new Set<string>())

  // Reset all per-open state each time the modal opens.
  React.useEffect(() => {
    if (open) {
      setSelected([])
      loadedByIdRef.current = new Map()
      seededRef.current = new Set()
    }
  }, [open])

  // As option pages resolve: remember each row, and auto-check any that are
  // already children of this account (seed once each). Memoized on accountId so
  // it's a stable effect dep inside AsyncMultiSelect.
  const handleItemsLoaded = React.useCallback(
    (items: AccountListItem[]) => {
      const map = loadedByIdRef.current
      const seeded = seededRef.current
      const fresh: AsyncOption[] = []
      for (const it of items) {
        map.set(it.id, it)
        if (it.parent_account_id === accountId && !seeded.has(it.id)) {
          seeded.add(it.id)
          fresh.push({ id: it.id, label: it.name })
        }
      }
      if (fresh.length) {
        setSelected((prev) => {
          const have = new Set(prev.map((p) => p.id))
          const add = fresh.filter((c) => !have.has(c.id))
          return add.length ? [...prev, ...add] : prev
        })
      }
    },
    [accountId],
  )

  // Adapter for AsyncMultiSelect: server filters to cycle-safe children
  // (`eligibleChildFor` drops this account + its entire ancestor chain) and
  // forwards the open-gated `enabled` flag (loadOnOpen) so the query only fires
  // when the dropdown is opened.
  const useOptions = (search: string, options?: { enabled?: boolean }) =>
    useAccountOptions(search, {
      eligibleChildFor: accountId,
      accountType,
      enabled: options?.enabled,
    })

  // Delta diff — computed from what's loaded + what's currently ticked. Every
  // ticked or unticked row is necessarily loaded (you can only click a visible
  // row), so `loadedByIdRef` always knows its `parent_account_id`.
  const { toAdd, toRemove, reparentIds } = React.useMemo(() => {
    const map = loadedByIdRef.current
    const chosen = new Set(selected.map((s) => s.id))
    // Adds: ticked rows that are NOT already children.
    const toAdd = selected
      .filter((s) => map.get(s.id)?.parent_account_id !== accountId)
      .map((s) => s.id)
    // 2-level policy: a ticked candidate that already has its own children
    // can't simply become a child — it and its subtree must flatten under this
    // account. Route those through the cascade path.
    const reparentIds = toAdd.filter((id) => map.get(id)?.has_children)
    // Removes: loaded children no longer ticked.
    const toRemove: string[] = []
    for (const it of map.values()) {
      if (it.parent_account_id === accountId && !chosen.has(it.id)) {
        toRemove.push(it.id)
      }
    }
    return { toAdd, toRemove, reparentIds }
  }, [selected, accountId])

  const changeCount = toAdd.length + toRemove.length
  // Base total from the API, shifted by the user's pending changes (+1 per
  // linked account, −1 per unlinked), so the count tracks edits before Save.
  const liveChildCount = Math.max(
    0,
    currentChildTotal + toAdd.length - toRemove.length,
  )

  function handleSave() {
    if (changeCount === 0) return
    syncMut.mutate(
      { toAdd, toRemove, reparentIds },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-x-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{S.linkChildDialog.title}</DialogTitle>
        </DialogHeader>
        {/* min-w-0: DialogContent is a CSS grid, so this item would otherwise
            keep min-width:auto and overflow the dialog (§8.7). */}
        <div className="min-w-0 space-y-1.5">
          <Label className="font-ui">{S.linkChildDialog.accountsLabel}</Label>
          <AsyncMultiSelect<AccountListItem>
            value={selected}
            onValueChange={setSelected}
            useOptions={useOptions}
            onItemsLoaded={handleItemsLoaded}
            toLabel={(a) => a.name}
            loadOnOpen
            clearable={false}
            placeholder={S.linkChildDialog.placeholder}
            summary={
              liveChildCount > 0
                ? S.linkChildDialog.childCount(liveChildCount)
                : undefined
            }
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {S.linkChildDialog.cancel}
          </Button>
          <Button
            disabled={changeCount === 0 || syncMut.isPending}
            onClick={handleSave}
          >
            {syncMut.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            {S.linkChildDialog.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
