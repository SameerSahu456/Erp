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
import { Typography } from "@/components/ui/typography"
import {
  AsyncSelect,
  type AsyncSelectOption,
} from "@/components/ui/async-select"

import type { AccountListItem, AccountTypeWire } from "../../api"
import {
  useAccountOptions,
  useSetParentAccount,
} from "../../hooks/accounts/useAccounts"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"

interface LinkParentAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The account whose parent we're setting — excluded so it can't pick itself. */
  accountId: string
  /** This account's current parent, if any — seeds the picker so the dialog
   *  reads as "Change parent" when one already exists. */
  currentParentId?: string | null
  /** Display name of the current parent — seeds the picker's chip label so it
   *  renders immediately, before the options page (which carries the label)
   *  loads. */
  currentParentName?: string
  /** How many child accounts this account currently has. When > 0, setting a
   *  parent cascades: this account AND all its children move under the new
   *  parent (2-level policy — a child can't keep its own children). Drives the
   *  warning copy and the cascade mutation path. */
  childCount?: number
  /** This account's type. When set, the parent picker only lists accounts of
   *  the same type (a parent must share the child's account type). */
  accountType?: AccountTypeWire
}

// Set-parent modal. A single-select dropdown (AsyncSelect over GET /crm/accounts
// — debounced server search + infinite scroll, §16.11) seeded with the current
// parent. Pick an account and Save to set it as this account's parent. The
// option list is filtered server-side via `eligibleParentFor` — the account
// itself and its entire subtree (any descendant) are dropped, so the picker
// can't offer a choice that would trip the backend's ACCOUNT_HIERARCHY_CYCLE
// guard. The bulk parent-child-relationships endpoint still validates on save.
export function LinkParentAccountDialog({
  open,
  onOpenChange,
  accountId,
  currentParentId,
  currentParentName,
  childCount = 0,
  accountType,
}: LinkParentAccountDialogProps) {
  const [selected, setSelected] = React.useState<AsyncSelectOption | null>(null)
  const hasChildren = childCount > 0
  const setParentMut = useSetParentAccount(accountId, { hasChildren })

  // Seed the selection with the current parent each time the modal opens so it
  // reads as "Change parent". Keyed on `open` only — a background refetch
  // shouldn't wipe the user's in-progress pick. The chip label seeds from the
  // passed-in name so it renders before the options page loads.
  React.useEffect(() => {
    if (open) {
      setSelected(
        currentParentId
          ? { id: currentParentId, label: currentParentName ?? "" }
          : null,
      )
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Adapter for AsyncSelect: server filters to cycle-safe parents
  // (`eligibleParentFor` drops this account + its whole subtree), and forwards
  // the open-gated `enabled` flag (loadOnOpen) so the query only fires when the
  // dropdown opens.
  const useOptions = (search: string, options?: { enabled?: boolean }) =>
    useAccountOptions(search, {
      eligibleParentFor: accountId,
      accountType,
      enabled: options?.enabled,
    })

  const isUnchanged = (selected?.id ?? null) === (currentParentId ?? null)

  function handleSave() {
    if (isUnchanged) return
    setParentMut.mutate(selected?.id ?? null, {
      onSuccess: () => onOpenChange(false),
    })
  }

  function handleRemove() {
    setParentMut.mutate(null, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-x-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{S.linkParentDialog.title}</DialogTitle>
        </DialogHeader>
        {/* min-w-0: DialogContent is a CSS grid, so this item would otherwise
            keep min-width:auto and overflow the dialog (§8.7). */}
        <div className="min-w-0 space-y-1.5">
          <Label className="font-ui">{S.linkParentDialog.accountLabel}</Label>
          <AsyncSelect<AccountListItem>
            value={selected}
            onValueChange={setSelected}
            useOptions={useOptions}
            toLabel={(a) => a.name}
            loadOnOpen
            placeholder={S.linkParentDialog.placeholder}
          />
          {hasChildren && selected?.id ? (
            <Typography
              variant="helper"
              tone="warning"
              className="block pt-1"
            >
              {S.linkParentDialog.reparentChildrenWarning(childCount)}
            </Typography>
          ) : null}
        </div>
        <DialogFooter className="sm:justify-between">
          {currentParentId ? (
            <Button
              variant="destructive"
              disabled={setParentMut.isPending}
              onClick={handleRemove}
            >
              {S.linkParentDialog.removeParent}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {S.linkParentDialog.cancel}
            </Button>
            <Button
              disabled={isUnchanged || setParentMut.isPending}
              onClick={handleSave}
            >
              {setParentMut.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              {S.linkParentDialog.save}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
