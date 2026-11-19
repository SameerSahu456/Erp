import { Star, X } from "lucide-react"

import { useUser } from "@modules/users"

import type { AccountOwnerWire } from "../../api"
import { UserRoles } from "../shared/UserRoles"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"

interface AccountOwnerCardProps {
  owner: AccountOwnerWire
  onMakePrimary: () => void
  onRemove: () => void
  isPromoting: boolean
  isRemoving: boolean
}

export function AccountOwnerCard({
  owner,
  onMakePrimary,
  onRemove,
  isPromoting,
  isRemoving,
}: AccountOwnerCardProps) {
  const userQuery = useUser(owner.user_id)
  const user = userQuery.data
  const email = user?.email?.trim() || null
  const phone = user?.phone?.trim() || null
  const roles = user?.roles ?? []

  const initials = owner.user_name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="group relative flex items-start gap-2 rounded-md border border-border/60 bg-muted/40 p-2 transition-colors hover:bg-muted/60">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
        {initials}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-1">
          <p className="truncate text-xs font-medium">{owner.user_name}</p>
          {owner.is_primary && (
            <Star className="size-2.5 shrink-0 fill-amber-500 text-amber-500" />
          )}
        </div>
        <UserRoles roles={roles} />
        {email && (
          <p className="truncate text-[10px] text-muted-foreground">{email}</p>
        )}
        {phone && (
          <p className="truncate text-[10px] text-muted-foreground">{phone}</p>
        )}
      </div>
      <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {!owner.is_primary && (
          <button
            type="button"
            onClick={onMakePrimary}
            disabled={isPromoting}
            className="rounded p-1 text-muted-foreground hover:bg-amber-100/50 hover:text-amber-700 disabled:opacity-50 dark:hover:bg-amber-900/30"
            aria-label={S.owners.makePrimaryOwner}
            title={S.owners.makePrimaryOwner}
          >
            <Star className="size-3" />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          disabled={isRemoving}
          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          aria-label={S.owners.removeOwner}
          title={S.owners.removeOwner}
        >
          <X className="size-3" />
        </button>
      </div>
    </div>
  )
}
