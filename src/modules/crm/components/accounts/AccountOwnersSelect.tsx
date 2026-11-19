import * as React from "react"
import { CheckIcon, Star, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Popover } from "@/components/ui/popover"
import { PopoverSelectTrigger } from "@/components/ui/popover-select-trigger"
import { useDebounce } from "@/shared/hooks"
import { UI } from "@/shared/constants"
import { getUserDisplayName, usePinnedUserRows, useUserOptionsWithPinnedRoles, type UserListItem } from "@modules/users"

import { InfiniteScrollPickerContent } from "../shared/InfiniteScrollPickerContent"

import {
  DEAL_NON_TERMINAL_STAGES,
  fetchDealStats,
  type DealStage,
} from "../../api"
import { ASSIGNEE_EXCLUDE_ROLE_NAMES, OWNER_INCLUDE_ROLE_NAMES } from "../../crm-roles"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"

export interface OwnerOption {
  id: string
  label: string
  // Effective channel_tags of the owner, captured on selection so the Account
  // form can check on save that the owner deals in the chosen account type.
  // `null` = unrestricted; `undefined` = unknown (hydrated from a saved
  // account, which doesn't embed it).
  channelTags?: string[] | null
  // Owner's role names, captured on selection so the type↔owner validation can
  // exempt admins/superadmins (always assignable). `undefined` = unknown
  // (hydrated from a saved account → re-fetched via `useUsersByIds`).
  roles?: string[]
}

interface AccountOwnersSelectProps {
  value: OwnerOption[]
  onValueChange: (next: OwnerOption[]) => void
  primaryOwnerId: string | null
  onPrimaryOwnerChange: (id: string | null) => void
  placeholder?: string
  // Users to hide from the dropdown — typically the IDs already assigned as
  // owners on the parent record, so an "Add owners" picker can't offer them
  // for re-selection.
  excludeIds?: string[]
  /** Optional channel-tag scope. When set, the dropdown only shows owners
   *  whose roles' channel_tags overlap with this list. The Account form
   *  passes `[selectedAccountType]` so the owner picker is scoped to the
   *  account's channel ("End Customer" | "Channel Partner" |
   *  "Cloud / Data Center"). Maps 1:1 since AccountType values now match
   *  the role channel_tags allow-list. */
  channelTags?: string[]
  /** Edit-mode only: the saved account's id. When present, removing an
   *  owner fires a `GET /crm/deals/stats?account_id=…&owner_id=…` check
   *  and blocks the removal if any deal on this account is owned by the
   *  user AND is still in a non-terminal stage (Closed Won / Closed Lost
   *  unblock). Sales has to resolve those deals first. Omit on create to
   *  skip the check entirely. */
  accountId?: string
}

// Multi-select async dropdown over GET /users (active only) with a "primary"
// indicator column. Owners list semantics match the backend Account schema:
//   - account_owner_ids: list[uuid]                 (this component's `value`)
//   - primary_owner_id:  uuid | None                (the starred chip)
//   - invariant: primary_owner_id ∈ account_owner_ids when both set
//
// Selection is stored as `{id, label}` so chips render even after the row
// scrolls out of the loaded page (per Coding-guideline §16.11 #5).
export function AccountOwnersSelect({
  value,
  onValueChange,
  primaryOwnerId,
  onPrimaryOwnerChange,
  placeholder = "Select account owners...",
  excludeIds,
  channelTags,
  accountId,
}: AccountOwnersSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [rawSearch, setRawSearch] = React.useState("")
  const search = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)
  // Per-owner-id pending flag — disables the chip × and the dropdown
  // checkbox while the deals-check is in flight, so repeated clicks
  // don't queue multiple identical /deals/stats calls.
  const [checkingOwnerId, setCheckingOwnerId] = React.useState<string | null>(null)

  // Guard for owner removal — only when this select is bound to a saved
  // account (`accountId` set). Returns `true` when removal is OK, `false`
  // when blocked (and shows the toast). The check uses /deals/stats so we
  // only need one request: the `by_stage` count tells us how many of the
  // owner's deals on this account are still open. "Closed Won" AND
  // "Closed Lost" both count as resolved, so either one unblocks.
  async function guardOwnerRemoval(ownerId: string): Promise<boolean> {
    if (!accountId) return true
    setCheckingOwnerId(ownerId)
    try {
      const stats = await fetchDealStats({
        account_id: accountId,
        // owner_id is now a multi-value filter; wrap the single id.
        owner_id: [ownerId],
      })
      const openCount = DEAL_NON_TERMINAL_STAGES.reduce(
        (sum, stage: DealStage) => sum + (stats.by_stage[stage] ?? 0),
        0,
      )
      if (openCount > 0) {
        const ownerLabel =
          value.find((v) => v.id === ownerId)?.label ?? "this owner"
        toast.error(
          `Cannot remove ${ownerLabel} — ${openCount} open deal${
            openCount === 1 ? "" : "s"
          } on this account. Close them (Closed Won / Closed Lost) first.`,
        )
        return false
      }
      return true
    } catch (err) {
      // Surface the error but DON'T silently drop the owner — better to
      // fail closed so a flaky network can't blow away ownership state.
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not verify open deals — owner not removed.",
      )
      return false
    } finally {
      setCheckingOwnerId(null)
    }
  }

  // Active users only. Eligibility is expressed as a negative filter
  // (`ASSIGNEE_EXCLUDE_ROLE_NAMES` in `crm-roles.ts`) so any new role added
  // to the seed is automatically eligible unless we opt it out — no FE
  // edit needed.
  // When an account type (channelTags) is selected, admin/superadmin are
  // PINNED on top so they stay selectable irrespective of the channel — they
  // carry no channel_tags but oversee all channels. No type → single
  // unfiltered query (pinning is a no-op).
  const query = useUserOptionsWithPinnedRoles(search, {
    isActive: true,
    excludeRoleNames: ASSIGNEE_EXCLUDE_ROLE_NAMES,
    channelTags,
    pinnedRoleNames: OWNER_INCLUDE_ROLE_NAMES,
    enabled: open,
  })
  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = query

  const excluded = React.useMemo(
    () => new Set(excludeIds ?? []),
    [excludeIds],
  )
  // Dedupe by id (keep first occurrence) — the pinned admins query and the
  // channel-scoped query can both return the same user (an admin who also
  // holds a tag-bearing role); the first/pinned occurrence wins so the row
  // stays on top and isn't shown twice.
  const loadedItems = React.useMemo(() => {
    const seen = new Set<string>()
    const out: UserListItem[] = []
    for (const u of (data?.pages ?? []).flatMap((p) => p.items)) {
      if (seen.has(u.id) || excluded.has(u.id)) continue
      seen.add(u.id)
      out.push(u)
    }
    return out
  }, [data?.pages, excluded])

  // Selected users first (as of open, not live), including ones on pages not
  // loaded yet; the paged list continues beneath them.
  const items = usePinnedUserRows({
    open,
    selectedIds: value.map((v) => v.id),
    loaded: loadedItems,
    search,
  })

  const selectedIds = React.useMemo(() => new Set(value.map((v) => v.id)), [value])

  async function toggle(item: UserListItem) {
    const id = item.id
    if (selectedIds.has(id)) {
      // Removal path — gate on the open-deals guard before mutating.
      const ok = await guardOwnerRemoval(id)
      if (!ok) return
      const next = value.filter((v) => v.id !== id)
      onValueChange(next)
      // If the primary was just removed, clear the primary so the form
      // submit-time guard doesn't fail. Caller can re-pick a new primary.
      if (primaryOwnerId === id) onPrimaryOwnerChange(null)
    } else {
      const label = getUserDisplayName(item)
      onValueChange([
        ...value,
        { id, label, channelTags: item.channel_tags, roles: item.roles },
      ])
    }
  }

  function setPrimary(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    onPrimaryOwnerChange(id === primaryOwnerId ? null : id)
  }

  async function removeChip(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const ok = await guardOwnerRemoval(id)
    if (!ok) return
    onValueChange(value.filter((v) => v.id !== id))
    if (primaryOwnerId === id) onPrimaryOwnerChange(null)
  }

  const triggerLabel =
    value.length === 0
      ? placeholder
      : `${value.length} owner${value.length === 1 ? "" : "s"} selected`

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverSelectTrigger hasValue={value.length > 0}>
          {triggerLabel}
        </PopoverSelectTrigger>
        <InfiniteScrollPickerContent
          search={{ value: rawSearch, onChange: setRawSearch, placeholder: "Search users..." }}
          query={{ isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage }}
          items={items}
          errorText="Failed to load users"
          renderItem={(item) => {
            const isSelected = selectedIds.has(item.id)
            const display = getUserDisplayName(item)
            return (
              <button
                type="button"
                onClick={() => void toggle(item)}
                disabled={checkingOwnerId === item.id}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                  "hover:bg-accent",
                  checkingOwnerId === item.id && "opacity-60",
                )}
              >
                <div
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/40",
                  )}
                >
                  {isSelected && <CheckIcon className="size-3" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate">{display}</div>
                  <div className="truncate text-[10.5px] text-muted-foreground">
                    {item.email}
                  </div>
                </div>
              </button>
            )
          }}
        />
      </Popover>

      {/* Selected owner chips with primary toggle */}
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((opt) => {
            const isPrimary = opt.id === primaryOwnerId
            return (
              <li
                key={opt.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[12px]",
                  isPrimary
                    ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-600/40 dark:bg-amber-950/30 dark:text-amber-100"
                    : "border-border bg-secondary/60",
                )}
              >
                <button
                  type="button"
                  onClick={(e) => setPrimary(opt.id, e)}
                  className="rounded p-0.5 hover:bg-amber-200/40 dark:hover:bg-amber-900/40"
                  aria-label={isPrimary ? S.ownersSelect.unsetPrimary : S.ownersSelect.makePrimary}
                  title={isPrimary ? S.ownersSelect.primaryOwner : S.ownersSelect.makePrimary}
                >
                  <Star
                    className={cn("size-3", isPrimary && "fill-amber-500 text-amber-500")}
                  />
                </button>
                <span className="max-w-[160px] truncate">{opt.label}</span>
                <button
                  type="button"
                  onClick={(e) => void removeChip(opt.id, e)}
                  disabled={checkingOwnerId === opt.id}
                  className={cn(
                    "rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground",
                    checkingOwnerId === opt.id && "opacity-60",
                  )}
                  aria-label={S.ownersSelect.removeOwner}
                >
                  <X className="size-3" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
