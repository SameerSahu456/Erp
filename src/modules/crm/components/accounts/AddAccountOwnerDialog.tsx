import { useState } from "react"

import { Button } from "@/components/ui/button"
import { assignableChannelTags } from "@/constants/channel-tags"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { ACCOUNTS_STRINGS as S } from "./accounts.strings"
import {
  AccountOwnersSelect,
  type OwnerOption,
} from "./AccountOwnersSelect"

interface AddAccountOwnerDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  existingIds: string[]
  onAdd: (picks: Array<{ userId: string; isPrimary: boolean }>) => void
  isPending: boolean
  /** Account's channel type — scopes the owner picker to users whose roles'
   *  channel_tags match (admin/superadmin stay pinned). Mirrors the create/
   *  edit form so the detail "Add owner" list matches it. */
  accountType?: string
  /** Saved account id — lets the picker guard against removing an owner who
   *  still has open deals on this account (edit-mode parity with the form). */
  accountId?: string
}

export function AddAccountOwnerDialog({
  open,
  onOpenChange,
  existingIds,
  onAdd,
  isPending,
  accountType,
  accountId,
}: AddAccountOwnerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Body is only mounted when the dialog is open — that keeps the
         *  picker / primary state fresh on every re-open without a
         *  set-state-in-effect reset. */}
        {open && (
          <AddAccountOwnerDialogBody
            existingIds={existingIds}
            onAdd={onAdd}
            onCancel={() => onOpenChange(false)}
            isPending={isPending}
            accountType={accountType}
            accountId={accountId}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function AddAccountOwnerDialogBody({
  existingIds,
  onAdd,
  onCancel,
  isPending,
  accountType,
  accountId,
}: {
  existingIds: string[]
  onAdd: (picks: Array<{ userId: string; isPrimary: boolean }>) => void
  onCancel: () => void
  isPending: boolean
  accountType?: string
  accountId?: string
}) {
  const [picked, setPicked] = useState<OwnerOption[]>([])
  const [primaryId, setPrimaryId] = useState<string | null>(null)

  return (
    <>
      <DialogHeader>
        <DialogTitle>{S.addOwnerDialog.title}</DialogTitle>
        <DialogDescription>
          {S.addOwnerDialog.description}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <AccountOwnersSelect
          value={picked}
          onValueChange={(next) => {
            setPicked(next)
            if (primaryId && !next.some((p) => p.id === primaryId)) {
              setPrimaryId(null)
            }
          }}
          primaryOwnerId={primaryId}
          onPrimaryOwnerChange={setPrimaryId}
          excludeIds={existingIds}
          channelTags={accountType ? assignableChannelTags(accountType) : undefined}
          accountId={accountId}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {S.addOwnerDialog.cancel}
        </Button>
        <Button
          onClick={() => {
            if (picked.length === 0) return
            onAdd(
              picked.map((p) => ({
                userId: p.id,
                isPrimary: primaryId === p.id,
              })),
            )
          }}
          disabled={picked.length === 0 || isPending}
        >
          {isPending
            ? S.addOwnerDialog.adding
            : picked.length > 1
              ? S.addOwnerDialog.addOwners(picked.length)
              : S.addOwnerDialog.addOwner}
        </Button>
      </DialogFooter>
    </>
  )
}
